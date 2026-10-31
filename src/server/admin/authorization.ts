import { AdminPermission, User, UserRole } from '../../types/index.js';
import { dbEngine } from '../db.js';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'SUPER_ADMIN',
  'MANAGE_USERS',
  'MANAGE_PAYMENTS',
  'MANAGE_FINANCE',
  'MANAGE_INTEGRATIONS',
  'MANAGE_SETTINGS',
  'MANAGE_MARKETPLACE',
  'MANAGE_FIELD',
  'MANAGE_SUPPORT',
];

export function permissionsForUser(user: User): AdminPermission[] {
  if (user.role !== 'ADMIN') return [];
  if (user.adminPermissions?.length) return user.adminPermissions;
  const rows = (dbEngine.db.userAdminPermissions || []).filter((p) => p.userId === user.id).map((p) => p.permission);
  if (rows.length) return rows;
  return ['SUPER_ADMIN'];
}

export function hasAdminPermission(user: User | undefined, permission: AdminPermission): boolean {
  if (!user || user.role !== 'ADMIN') return false;
  const perms = permissionsForUser(user);
  if (perms.includes('SUPER_ADMIN')) return true;
  return perms.includes(permission);
}

export function canAdmin(user: User | undefined, permission: AdminPermission): boolean {
  return hasAdminPermission(user, permission);
}

export function assignedRolesForUser(userId: string): UserRole[] {
  const fromDb = (dbEngine.db.userRoleAssignments || [])
    .filter((a) => a.userId === userId && a.status === 'ACTIVE')
    .map((a) => a.role);
  const user = dbEngine.db.users.find((u) => u.id === userId);
  const primary = user?.role;
  const set = new Set<UserRole>(fromDb);
  if (primary) set.add(primary);
  return [...set];
}

export function userHasRole(userId: string, role: UserRole): boolean {
  return assignedRolesForUser(userId).includes(role);
}

export function permissionForRoute(path: string): AdminPermission | null {
  if (path.includes('/clients') || path.includes('/staff') || path.includes('/users')) return 'MANAGE_USERS';
  if (path.includes('/gateways') || path.includes('/payments')) return 'MANAGE_PAYMENTS';
  if (path.includes('/finance') || path.includes('/withdrawals') || path.includes('/commission')) return 'MANAGE_FINANCE';
  if (path.includes('/integrations') || path.includes('/api-clients')) return 'MANAGE_INTEGRATIONS';
  if (path.includes('/settings')) return 'MANAGE_SETTINGS';
  if (path.includes('/subscriptions') || path.includes('/plans')) return 'MANAGE_FINANCE';
  if (path.includes('/field') || path.includes('/inspections')) return 'MANAGE_FIELD';
  if (path.includes('/disputes') || path.includes('/verifications')) return 'MANAGE_SUPPORT';
  if (path.includes('/analytics') || path.includes('/dashboard') || path.includes('/health')) return 'MANAGE_SETTINGS';
  return 'MANAGE_SETTINGS';
}
