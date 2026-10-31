/**
 * Super Admin Control Center API routes
 */
import { Express, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbEngine } from './db.js';
import { requireAuth, requireAdminPermission, logAuditEvent, AuthenticatedRequest, generateToken } from './auth.js';
import { publicUser, publicUsers } from './domain/publicUser.js';
import { isUserStatus, canSelfRegister } from './domain/rbac.js';
import { newId } from './domain/ids.js';
import { validatePassword } from './domain/passwords.js';
import { buildAdminAnalytics } from './admin/analytics.js';
import { ALL_ADMIN_PERMISSIONS, assignedRolesForUser, canAdmin, permissionsForUser } from './admin/authorization.js';
import {
  buildAzamPayEnvFromStore,
  getIntegrationSecret,
  listIntegrationSecretsMeta,
  logIntegrationEvent,
  setIntegrationSecret,
} from './admin/integrationStore.js';
import { adminIntegrationsPayload, opsHealthSnapshot } from './domain/opsHealth.js';
import { requestAzamPayToken, azamPayConfigured } from './payments/azampay.js';
import { createAuthToken } from './services/tokens.js';
import { notify } from './services/notify.js';
// reset token stored via createAuthToken; email flow uses existing password reset endpoint
import { maskSecret, integrationEncryptionConfigured } from './admin/encryption.js';
import {
  AdminPermission,
  PaymentGatewayConfig,
  SubscriptionPlan,
  UserRole,
  UserRoleAssignment,
} from '../types/index.js';
import { calculateBookingQuote } from './domain/pricing.js';
import crypto from 'crypto';

function ensureAdminCollections() {
  const db = dbEngine.db as any;
  for (const key of [
    'userRoleAssignments',
    'userAdminPermissions',
    'adminNotes',
    'integrationCredentials',
    'integrationLogs',
    'paymentGatewayConfigs',
    'webhookEvents',
    'commissionRules',
    'subscriptionPlans',
    'subscriptions',
    'apiClients',
    'apiClientKeys',
    'notificationTemplates',
  ]) {
    if (!Array.isArray(db[key])) db[key] = [];
  }
}

export function registerAdminRoutes(app: Express) {
  ensureAdminCollections();

  app.get('/api/admin/me/permissions', requireAuth, requireAdminPermission('MANAGE_SETTINGS'), (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: { permissions: permissionsForUser(req.user!) } });
  });

  app.get('/api/admin/analytics', requireAuth, requireAdminPermission('MANAGE_SETTINGS'), (req: AuthenticatedRequest, res: Response) => {
    const data = buildAdminAnalytics({
      from: String(req.query.from || ''),
      to: String(req.query.to || ''),
      granularity: String(req.query.granularity || 'day'),
    });
    res.json({ success: true, data });
  });

  app.get('/api/admin/health', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), async (_req, res) => {
    const snap = opsHealthSnapshot();
    res.json({
      success: true,
      data: {
        ...snap,
        encryption: { configured: integrationEncryptionConfigured() },
        database: { ok: true, driver: process.env.DATABASE_URL ? 'prisma' : 'file' },
      },
    });
  });

  // ——— Clients ———
  app.get('/api/admin/clients', requireAuth, requireAdminPermission('MANAGE_USERS'), (req, res) => {
    const q = String(req.query.q || '').toLowerCase();
    const role = String(req.query.role || '');
    const status = String(req.query.status || '');
    let rows = dbEngine.db.users.filter((u) => u.role !== 'ADMIN');
    if (q) rows = rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (role) rows = rows.filter((u) => u.role === role || assignedRolesForUser(u.id).includes(role as UserRole));
    if (status) rows = rows.filter((u) => u.status === status);
    res.json({ success: true, data: publicUsers(rows) });
  });

  app.get('/api/admin/clients/:id', requireAuth, requireAdminPermission('MANAGE_USERS'), (req, res) => {
    const user = dbEngine.db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'Client not found.' } });
    const notes = (dbEngine.db.adminNotes || []).filter((n) => n.userId === user.id);
    res.json({
      success: true,
      data: {
        user: publicUser(user),
        roles: assignedRolesForUser(user.id),
        vendorProfile: dbEngine.db.vendorProfiles.find((v) => v.userId === user.id) || null,
        hostProfile: dbEngine.db.hostProfiles.find((h) => h.userId === user.id) || null,
        bookings: dbEngine.db.bookings.filter((b) => b.vendorId === user.id || b.hostId === user.id).slice(0, 50),
        payments: dbEngine.db.payments.filter((p) => p.vendorId === user.id).slice(0, 50),
        notes,
      },
    });
  });

  app.post('/api/admin/clients', requireAuth, requireAdminPermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
    const { name, email, phone, password, roles, vendorProfile, hostProfile } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: { message: 'Name and email required.' } });
    if (dbEngine.db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ success: false, error: { message: 'Email already in use.' } });
    }
    const roleList: UserRole[] = Array.isArray(roles) && roles.length ? roles : ['VENDOR'];
    for (const r of roleList) {
      if (!canSelfRegister(r) && r !== 'FIELD_AGENT') {
        return res.status(400).json({ success: false, error: { message: `Cannot assign role ${r} via client create.` } });
      }
    }
    const rawPassword = password || `Client${Math.floor(100000 + Math.random() * 900000)}!`;
    const pw = validatePassword(rawPassword);
    if (!pw.ok) return res.status(400).json({ success: false, error: { message: pw.message } });
    const now = new Date().toISOString();
    const primaryRole = roleList[0] as UserRole;
    const user = {
      id: newId('usr'),
      name,
      email: String(email).toLowerCase(),
      phone: phone || '',
      passwordHash: bcrypt.hashSync(rawPassword, 10),
      role: primaryRole,
      activeRole: primaryRole,
      status: 'ACTIVE' as const,
      emailVerifiedAt: now,
      failedLoginCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    dbEngine.db.users.push(user);
    for (const r of roleList) {
      (dbEngine.db.userRoleAssignments as UserRoleAssignment[]).push({
        id: newId('ura'),
        userId: user.id,
        role: r,
        status: 'ACTIVE',
        grantedBy: req.user!.id,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (roleList.includes('VENDOR') && vendorProfile?.businessName) {
      dbEngine.db.vendorProfiles.push({
        id: newId('vprof'),
        userId: user.id,
        businessName: vendorProfile.businessName,
        category: vendorProfile.category || 'Food & Beverages',
        address: vendorProfile.address || '',
        city: vendorProfile.city || 'Dar es Salaam',
        region: vendorProfile.region || 'Dar es Salaam',
        country: 'Tanzania',
        verificationStatus: 'PENDING',
      });
    }
    if (roleList.includes('HOST') && hostProfile?.businessName) {
      dbEngine.db.hostProfiles.push({
        id: newId('hprof'),
        userId: user.id,
        businessName: hostProfile.businessName,
        phone: phone || '',
        verificationStatus: 'PENDING',
      });
    }
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'CLIENT_CREATED', 'User', user.id, roleList.join(','));
    res.json({ success: true, data: { user: publicUser(user), temporaryPassword: password ? undefined : rawPassword } });
  });

  app.patch('/api/admin/clients/:id', requireAuth, requireAdminPermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
    const user = dbEngine.db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'Client not found.' } });
    const { name, phone, status, roles } = req.body || {};
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (status && isUserStatus(status)) user.status = status;
    if (Array.isArray(roles)) {
      for (const r of roles as UserRole[]) {
        if (!(dbEngine.db.userRoleAssignments || []).some((a) => a.userId === user.id && a.role === r)) {
          (dbEngine.db.userRoleAssignments || []).push({
            id: newId('ura'),
            userId: user.id,
            role: r,
            status: 'ACTIVE',
            grantedBy: req.user!.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      if (roles.length) user.role = roles[0];
    }
    user.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'CLIENT_UPDATED', 'User', user.id);
    res.json({ success: true, data: publicUser(user) });
  });

  app.post('/api/admin/clients/:id/notes', requireAuth, requireAdminPermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ success: false, error: { message: 'Note body required.' } });
    const note = {
      id: newId('anote'),
      userId: req.params.id,
      authorId: req.user!.id,
      authorName: req.user!.name,
      body,
      createdAt: new Date().toISOString(),
    };
    (dbEngine.db.adminNotes || []).unshift(note);
    void dbEngine.saveAsync();
    res.json({ success: true, data: note });
  });

  app.post('/api/admin/clients/:id/reset-password', requireAuth, requireAdminPermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
    const user = dbEngine.db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    const token = createAuthToken(dbEngine.db, user.id, 'PASSWORD_RESET', 60 * 60 * 1000);
    notify(user.id, 'Password reset', 'An administrator requested a password reset for your account.');
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'PASSWORD_RESET_SENT', 'User', user.id);
    res.json({ success: true, data: { sent: true } });
  });

  app.post('/api/admin/clients/:id/verify-email', requireAuth, requireAdminPermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
    const user = dbEngine.db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    user.emailVerifiedAt = new Date().toISOString();
    if (user.status === 'PENDING') user.status = 'ACTIVE';
    user.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'EMAIL_VERIFIED_ADMIN', 'User', user.id);
    res.json({ success: true, data: publicUser(user) });
  });

  app.post('/api/admin/staff', requireAuth, requireAdminPermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
    if (!canAdmin(req.user, 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, error: { message: 'Only super admins can create staff.' } });
    }
    const { name, email, phone, password, permissions } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: { message: 'Name and email required.' } });
    const perms: AdminPermission[] = Array.isArray(permissions) ? permissions : ['MANAGE_SUPPORT'];
    if (perms.includes('SUPER_ADMIN') && !canAdmin(req.user, 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, error: { message: 'Cannot grant SUPER_ADMIN.' } });
    }
    const rawPassword = password || `Admin${Math.floor(100000 + Math.random() * 900000)}!`;
    const pw = validatePassword(rawPassword);
    if (!pw.ok) return res.status(400).json({ success: false, error: { message: pw.message } });
    const now = new Date().toISOString();
    const user = {
      id: newId('usr'),
      name,
      email: String(email).toLowerCase(),
      phone: phone || '',
      passwordHash: bcrypt.hashSync(rawPassword, 10),
      role: 'ADMIN' as const,
      status: 'ACTIVE' as const,
      adminPermissions: perms,
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    dbEngine.db.users.push(user);
    for (const p of perms) {
      (dbEngine.db.userAdminPermissions || []).push({
        id: newId('uap'),
        userId: user.id,
        permission: p,
        grantedBy: req.user!.id,
        createdAt: now,
      });
    }
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'STAFF_CREATED', 'User', user.id, perms.join(','));
    res.json({ success: true, data: { user: publicUser(user), temporaryPassword: password ? undefined : rawPassword } });
  });

  // ——— Payment gateways ———
  app.get('/api/admin/gateways', requireAuth, requireAdminPermission('MANAGE_PAYMENTS'), (_req, res) => {
    const configs = dbEngine.db.paymentGatewayConfigs || [];
    const registry = [
      { provider: 'AZAMPAY', integrated: true, name: 'Azam Pay' },
      { provider: 'PESAPAL', integrated: false, name: 'Pesapal' },
      { provider: 'STRIPE', integrated: false, name: 'Stripe' },
      { provider: 'FLUTTERWAVE', integrated: false, name: 'Flutterwave' },
    ];
    res.json({
      success: true,
      data: registry.map((r) => ({
        ...r,
        config: configs.find((c) => c.provider === r.provider) || null,
        secrets: r.provider === 'AZAMPAY' && r.integrated
          ? {
              sandbox: listIntegrationSecretsMeta('AZAMPAY', 'sandbox'),
              live: listIntegrationSecretsMeta('AZAMPAY', 'live'),
            }
          : undefined,
      })),
    });
  });

  app.put('/api/admin/gateways/:provider', requireAuth, requireAdminPermission('MANAGE_PAYMENTS'), (req: AuthenticatedRequest, res: Response) => {
    const provider = String(req.params.provider).toUpperCase();
    if (provider !== 'AZAMPAY') {
      return res.status(400).json({ success: false, error: { message: 'Provider not integrated yet.' } });
    }
    const { enabled, isDefault, environment, secrets, configJson } = req.body || {};
    if (!dbEngine.db.paymentGatewayConfigs) dbEngine.db.paymentGatewayConfigs = [];
    let row = dbEngine.db.paymentGatewayConfigs.find((c) => c.provider === provider);
    const now = new Date().toISOString();
    if (!row) {
      row = {
        id: newId('pgw'),
        provider: provider as PaymentGatewayConfig['provider'],
        enabled: false,
        isDefault: false,
        environment: 'sandbox',
        configJson: {},
        updatedAt: now,
      };
      dbEngine.db.paymentGatewayConfigs.push(row);
    }
    if (typeof enabled === 'boolean') row.enabled = enabled;
    if (typeof isDefault === 'boolean') row.isDefault = isDefault;
    if (environment === 'live' || environment === 'sandbox') row.environment = environment;
    if (configJson && typeof configJson === 'object') row.configJson = configJson;
    row.updatedAt = now;
    const env = row.environment;
    if (secrets && typeof secrets === 'object') {
      for (const [key, val] of Object.entries(secrets)) {
        if (typeof val === 'string' && val.trim()) {
          setIntegrationSecret('AZAMPAY', env, key, val.trim(), req.user!.id);
        }
      }
    }
    if (row.isDefault) {
      for (const c of dbEngine.db.paymentGatewayConfigs) {
        if (c.id !== row!.id) c.isDefault = false;
      }
    }
    dbEngine.db.settings.azamPayEnvironment = row.environment;
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'GATEWAY_UPDATED', 'PaymentGateway', row.id, provider);
    res.json({ success: true, data: row });
  });

  app.post('/api/admin/gateways/:provider/test', requireAuth, requireAdminPermission('MANAGE_PAYMENTS'), async (req: AuthenticatedRequest, res: Response) => {
    const provider = String(req.params.provider).toUpperCase();
    if (provider !== 'AZAMPAY') return res.status(400).json({ success: false, error: { message: 'Not integrated.' } });
    const config = (dbEngine.db.paymentGatewayConfigs || []).find((c) => c.provider === 'AZAMPAY');
    const env = config?.environment || 'sandbox';
    const started = Date.now();
    try {
      const azEnv = buildAzamPayEnvFromStore(env);
      if (!azamPayConfigured(azEnv)) throw new Error('Missing Azam Pay credentials.');
      await requestAzamPayToken(azEnv);
      const ms = Date.now() - started;
      if (config) {
        config.lastTestAt = new Date().toISOString();
        config.lastTestOk = true;
        config.lastTestMessage = 'Token OK';
      }
      logIntegrationEvent({ provider: 'AZAMPAY', operation: 'test_connection', success: true, durationMs: ms });
      void dbEngine.saveAsync();
      res.json({ success: true, data: { ok: true, durationMs: ms } });
    } catch (err: any) {
      const ms = Date.now() - started;
      if (config) {
        config.lastTestAt = new Date().toISOString();
        config.lastTestOk = false;
        config.lastTestMessage = err.message;
      }
      logIntegrationEvent({ provider: 'AZAMPAY', operation: 'test_connection', success: false, durationMs: ms, errorMessage: err.message });
      void dbEngine.saveAsync();
      res.status(400).json({ success: false, error: { message: err.message || 'Connection failed.' } });
    }
  });

  app.get('/api/admin/payments/logs', requireAuth, requireAdminPermission('MANAGE_PAYMENTS'), (_req, res) => {
    const attempts = [...(dbEngine.db.paymentAttempts || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
    res.json({ success: true, data: attempts });
  });

  app.get('/api/admin/webhooks/logs', requireAuth, requireAdminPermission('MANAGE_PAYMENTS'), (_req, res) => {
    const logs = [...(dbEngine.db.webhookEvents || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
    res.json({ success: true, data: logs });
  });

  // ——— Integrations config ———
  app.get('/api/admin/integrations/config', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), (_req, res) => {
    res.json({
      success: true,
      data: {
        status: adminIntegrationsPayload(),
        encryptionConfigured: integrationEncryptionConfigured(),
        azamPay: {
          sandbox: listIntegrationSecretsMeta('AZAMPAY', 'sandbox'),
          live: listIntegrationSecretsMeta('AZAMPAY', 'live'),
        },
        smtp: {
          host: process.env.SMTP_HOST || '',
          port: process.env.SMTP_PORT || '',
          user: process.env.SMTP_USER ? maskSecret(process.env.SMTP_USER) : '',
          passConfigured: Boolean(process.env.SMTP_PASS || getIntegrationSecret('SMTP', 'live', 'SMTP_PASS')),
        },
        gemini: { configured: Boolean(process.env.GEMINI_API_KEY || getIntegrationSecret('GEMINI', 'live', 'GEMINI_API_KEY')) },
      },
    });
  });

  app.put('/api/admin/integrations/:provider', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), (req: AuthenticatedRequest, res: Response) => {
    const provider = String(req.params.provider).toUpperCase() as any;
    const { environment = 'live', secrets } = req.body || {};
    const env = environment === 'sandbox' ? 'sandbox' : 'live';
    if (secrets && typeof secrets === 'object') {
      for (const [key, val] of Object.entries(secrets)) {
        if (typeof val === 'string' && val.trim()) setIntegrationSecret(provider, env, key, val.trim(), req.user!.id);
      }
    }
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'INTEGRATION_UPDATED', 'Integration', provider);
    res.json({ success: true, data: { saved: true } });
  });

  app.get('/api/admin/integrations/logs', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), (_req, res) => {
    res.json({ success: true, data: (dbEngine.db.integrationLogs || []).slice(0, 200) });
  });

  // ——— Commission rules ———
  app.get('/api/admin/commission-rules', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (_req, res) => {
    res.json({ success: true, data: dbEngine.db.commissionRules || [] });
  });

  app.post('/api/admin/commission-rules', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (req: AuthenticatedRequest, res: Response) => {
    const { effectiveFrom, platformBps, category, planId } = req.body || {};
    if (!effectiveFrom || typeof platformBps !== 'number') {
      return res.status(400).json({ success: false, error: { message: 'effectiveFrom and platformBps required.' } });
    }
    const rule = {
      id: newId('crule'),
      effectiveFrom: String(effectiveFrom),
      platformBps: Math.round(platformBps),
      category: category || undefined,
      planId: planId || undefined,
      createdAt: new Date().toISOString(),
    };
    (dbEngine.db.commissionRules || []).push(rule);
    dbEngine.db.settings.commissionPercentage = platformBps / 100;
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'COMMISSION_RULE_CREATED', 'CommissionRule', rule.id);
    res.json({ success: true, data: rule });
  });

  // ——— Subscriptions ———
  app.get('/api/admin/subscription-plans', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (_req, res) => {
    res.json({ success: true, data: dbEngine.db.subscriptionPlans || [] });
  });

  app.post('/api/admin/subscription-plans', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (req: AuthenticatedRequest, res: Response) => {
    const { name, priceTzs, billingPeriod, trialDays, entitlements, description } = req.body || {};
    if (!name || typeof priceTzs !== 'number') return res.status(400).json({ success: false, error: { message: 'name and priceTzs required.' } });
    const now = new Date().toISOString();
    const plan: SubscriptionPlan = {
      id: newId('plan'),
      name,
      description,
      priceTzs,
      currency: 'TZS',
      billingPeriod: billingPeriod || 'MONTHLY',
      trialDays: trialDays || 0,
      active: true,
      entitlements: Array.isArray(entitlements) ? entitlements : [],
      createdAt: now,
      updatedAt: now,
    };
    (dbEngine.db.subscriptionPlans || []).push(plan);
    void dbEngine.saveAsync();
    res.json({ success: true, data: plan });
  });

  app.patch('/api/admin/subscription-plans/:id', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (req, res) => {
    const plan = (dbEngine.db.subscriptionPlans || []).find((p) => p.id === req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: { message: 'Plan not found.' } });
    Object.assign(plan, req.body, { updatedAt: new Date().toISOString() });
    void dbEngine.saveAsync();
    res.json({ success: true, data: plan });
  });

  app.get('/api/admin/subscriptions', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (_req, res) => {
    res.json({ success: true, data: dbEngine.db.subscriptions || [] });
  });

  app.post('/api/admin/subscriptions', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (req: AuthenticatedRequest, res: Response) => {
    const { userId, planId, trialDays } = req.body || {};
    const plan = (dbEngine.db.subscriptionPlans || []).find((p) => p.id === planId);
    const user = dbEngine.db.users.find((u) => u.id === userId);
    if (!plan || !user) return res.status(404).json({ success: false, error: { message: 'Plan or user not found.' } });
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    const sub = {
      id: newId('sub'),
      userId,
      planId,
      status: trialDays ? 'TRIAL' as const : 'ACTIVE' as const,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      trialEndsAt: trialDays ? new Date(now.getTime() + trialDays * 86400000).toISOString() : undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    (dbEngine.db.subscriptions || []).push(sub);
    void dbEngine.saveAsync();
    res.json({ success: true, data: sub });
  });

  // ——— API clients ———
  app.get('/api/admin/api-clients', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), (_req, res) => {
    res.json({ success: true, data: dbEngine.db.apiClients || [] });
  });

  app.post('/api/admin/api-clients', requireAuth, requireAdminPermission('MANAGE_INTEGRATIONS'), (req: AuthenticatedRequest, res: Response) => {
    const { name, description, scopes, rateLimitPerHour } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: { message: 'name required.' } });
    const now = new Date().toISOString();
    const client = {
      id: newId('apic'),
      name,
      description,
      scopes: Array.isArray(scopes) ? scopes : ['read:shelves'],
      rateLimitPerHour: rateLimitPerHour || 1000,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    (dbEngine.db.apiClients || []).push(client);
    const rawKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
    (dbEngine.db.apiClientKeys || []).push({
      id: newId('apikey'),
      clientId: client.id,
      keyPrefix: rawKey.slice(0, 8),
      keyHash: bcrypt.hashSync(rawKey, 10),
      createdAt: now,
    });
    void dbEngine.saveAsync();
    res.json({ success: true, data: { client, apiKey: rawKey } });
  });

  // ——— Notification templates ———
  app.get('/api/admin/notification-templates', requireAuth, requireAdminPermission('MANAGE_SETTINGS'), (_req, res) => {
    res.json({ success: true, data: dbEngine.db.notificationTemplates || [] });
  });

  app.put('/api/admin/notification-templates/:key', requireAuth, requireAdminPermission('MANAGE_SETTINGS'), (req: AuthenticatedRequest, res: Response) => {
    const key = req.params.key;
    const { channel, subject, body } = req.body || {};
    if (!dbEngine.db.notificationTemplates) dbEngine.db.notificationTemplates = [];
    let t = dbEngine.db.notificationTemplates.find((x) => x.key === key);
    const now = new Date().toISOString();
    if (!t) {
      t = { id: newId('ntpl'), key, channel: channel || 'EMAIL', subject, body: body || '', updatedAt: now };
      dbEngine.db.notificationTemplates.push(t);
    } else {
      if (channel) t.channel = channel;
      if (subject !== undefined) t.subject = subject;
      if (body !== undefined) t.body = body;
      t.updatedAt = now;
    }
    void dbEngine.saveAsync();
    res.json({ success: true, data: t });
  });

  app.post('/api/admin/notification-templates/:key/test', requireAuth, requireAdminPermission('MANAGE_SETTINGS'), async (req: AuthenticatedRequest, res: Response) => {
    const to = String(req.body?.to || req.user!.email);
    notify(req.user!.id, 'Test notification', `Template ${req.params.key} test (intended for ${to}).`);
    res.json({ success: true, data: { sent: true } });
  });

  // ——— Inspections admin ———
  app.post('/api/admin/inspections', requireAuth, requireAdminPermission('MANAGE_FIELD'), (req: AuthenticatedRequest, res: Response) => {
    const { agentId, shopId, shelfId, scheduledAt } = req.body || {};
    if (!agentId || !shopId || !shelfId) return res.status(400).json({ success: false, error: { message: 'agentId, shopId, shelfId required.' } });
    const visit = {
      id: newId('fv'),
      agentId,
      shopId,
      shelfId,
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
    };
    dbEngine.db.fieldVisits.push(visit as any);
    void dbEngine.saveAsync();
    res.json({ success: true, data: visit });
  });

  app.patch('/api/admin/inspections/:id', requireAuth, requireAdminPermission('MANAGE_FIELD'), (req: AuthenticatedRequest, res: Response) => {
    const visit = dbEngine.db.fieldVisits.find((v) => v.id === req.params.id);
    if (!visit) return res.status(404).json({ success: false, error: { message: 'Visit not found.' } });
    const { status, agentId } = req.body || {};
    if (status) visit.status = status;
    if (agentId) visit.agentId = agentId;
    void dbEngine.saveAsync();
    res.json({ success: true, data: visit });
  });

  // ——— Featured shelves ———
  app.patch('/api/admin/shelves/:id/featured', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (req: AuthenticatedRequest, res: Response) => {
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    shelf.featured = Boolean(req.body?.featured);
    shelf.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    res.json({ success: true, data: shelf });
  });

  // Export clients CSV
  app.get('/api/admin/clients/export.csv', requireAuth, requireAdminPermission('MANAGE_USERS'), (_req, res) => {
    const rows = dbEngine.db.users.filter((u) => u.role !== 'ADMIN');
    const header = 'id,name,email,role,status,createdAt\n';
    const body = rows.map((u) => `${u.id},${JSON.stringify(u.name)},${u.email},${u.role},${u.status},${u.createdAt}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(header + body);
  });

  // Permissions catalog
  app.get('/api/admin/permissions', requireAuth, requireAdminPermission('MANAGE_USERS'), (_req, res) => {
    res.json({ success: true, data: ALL_ADMIN_PERMISSIONS });
  });

  // Quote preview for commission
  app.post('/api/admin/commission-preview', requireAuth, requireAdminPermission('MANAGE_FINANCE'), (req, res) => {
    const { monthlyPriceTzs, durationMonths, commissionPercentage } = req.body || {};
    const quote = calculateBookingQuote({
      monthlyPriceTzs: Number(monthlyPriceTzs) || 0,
      durationMonths: Number(durationMonths) || 1,
      commissionPercentage: Number(commissionPercentage) ?? dbEngine.db.settings.commissionPercentage,
    });
    res.json({ success: true, data: quote });
  });
}
