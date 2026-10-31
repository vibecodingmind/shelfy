import crypto from 'crypto';
import { Express, Request, Response } from 'express';
import { dbEngine } from '../db.js';
import { runtimeEnv } from '../services/platformConfig.js';
import { platformIntegrations } from '../services/platformConfig.js';
import { resolvedAppUrl } from '../services/jwtSecret.js';
import { newId } from '../domain/ids.js';
import { User, UserRole } from '../../types/index.js';
import { generateToken } from '../auth.js';
import { createAuthToken, REFRESH_TOKEN_TTL_MS } from '../services/tokens.js';
import { logAuditEvent } from '../auth.js';
import bcrypt from 'bcryptjs';

const oauthStates = new Map<string, { createdAt: number; mode: 'login' | 'link' }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function purgeStates() {
  const now = Date.now();
  for (const [k, v] of oauthStates) {
    if (now - v.createdAt > STATE_TTL_MS) oauthStates.delete(k);
  }
}

function googleOAuthReady(env: NodeJS.ProcessEnv): boolean {
  const int = platformIntegrations();
  return Boolean(
    int.oauth?.google?.enabled &&
      int.oauth.google.clientId?.trim() &&
      env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  );
}

function findOrCreateGoogleUser(email: string, name: string): User {
  const normalized = email.toLowerCase().trim();
  let user = dbEngine.db.users.find((u) => u.email.toLowerCase() === normalized);
  if (user) return user;

  const now = new Date().toISOString();
  const id = newId('usr');
  const randomPass = crypto.randomBytes(24).toString('hex');
  user = {
    id,
    name: name.trim() || email.split('@')[0],
    email: normalized,
    phone: '',
    role: 'VENDOR' as UserRole,
    passwordHash: bcrypt.hashSync(randomPass, 10),
    status: 'ACTIVE',
    emailVerifiedAt: now,
    failedLoginCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  dbEngine.db.users.push(user);
  void dbEngine.saveAsync();
  return user;
}

export function registerGoogleOAuthRoutes(app: Express, port: number) {
  app.get('/api/auth/google', (req: Request, res: Response) => {
    purgeStates();
    const env = runtimeEnv();
    if (!googleOAuthReady(env)) {
      return res.status(503).json({
        success: false,
        error: { message: 'Google sign-in is not configured. Enable it in Admin → Settings → Platform.' },
      });
    }
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID!.trim();
    const redirectUri = `${resolvedAppUrl(env, port).replace(/\/$/, '')}/api/auth/google/callback`;
    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, { createdAt: Date.now(), mode: 'login' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    purgeStates();
    const env = runtimeEnv();
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${resolvedAppUrl(env, port)}/?oauth_error=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).send('Invalid OAuth callback.');
    }
    const st = oauthStates.get(state);
    oauthStates.delete(state);
    if (!st || Date.now() - st.createdAt > STATE_TTL_MS) {
      return res.status(400).send('OAuth state expired. Try again.');
    }
    if (!googleOAuthReady(env)) {
      return res.status(503).send('Google sign-in is not configured.');
    }

    const redirectUri = `${resolvedAppUrl(env, port).replace(/\/$/, '')}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => '');
      return res.status(400).send(`Google token exchange failed: ${detail.slice(0, 200)}`);
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return res.status(400).send('Google did not return an access token.');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileRes.ok) {
      return res.status(400).send('Could not load Google profile.');
    }
    const profile = (await profileRes.json()) as { email?: string; name?: string; email_verified?: boolean };
    if (!profile.email || profile.email_verified === false) {
      return res.status(400).send('Google account must have a verified email.');
    }

    const user = findOrCreateGoogleUser(profile.email, profile.name || profile.email);
    logAuditEvent(user.id, user.name, user.role, 'USER_LOGIN', 'User', user.id, 'Google OAuth');

    const token = generateToken(user);
    const refresh = createAuthToken(dbEngine.db, user.id, 'REFRESH', REFRESH_TOKEN_TTL_MS);
    const front = resolvedAppUrl(env, port).replace(/\/$/, '');
    res.redirect(
      `${front}/?oauth=1&token=${encodeURIComponent(token)}&refresh=${encodeURIComponent(refresh.raw)}`
    );
  });
}
