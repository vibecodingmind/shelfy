import { describe, it, expect } from 'vitest';
import { canAdmin, permissionsForUser } from './authorization.js';
import { User } from '../../types/index.js';

const admin: User = {
  id: 'a1',
  name: 'Admin',
  email: 'a@test.co',
  phone: '',
  passwordHash: 'x',
  role: 'ADMIN',
  status: 'ACTIVE',
  adminPermissions: ['MANAGE_USERS'],
  createdAt: '',
  updatedAt: '',
};

describe('admin authorization', () => {
  it('grants SUPER_ADMIN all actions', () => {
    const superAdmin = { ...admin, adminPermissions: ['SUPER_ADMIN'] as const };
    expect(canAdmin(superAdmin, 'MANAGE_PAYMENTS')).toBe(true);
  });

  it('restricts limited admin', () => {
    expect(canAdmin(admin, 'MANAGE_USERS')).toBe(true);
    expect(canAdmin(admin, 'MANAGE_PAYMENTS')).toBe(false);
  });

  it('defaults missing permissions to SUPER_ADMIN for ADMIN role', () => {
    const legacy = { ...admin, adminPermissions: undefined };
    expect(permissionsForUser(legacy)).toContain('SUPER_ADMIN');
  });
});
