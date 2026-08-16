import { User } from '../../types/index.js';

export type PublicUser = Omit<User, 'passwordHash' | 'failedLoginCount' | 'lockedUntil'>;

export function publicUser(user: User): PublicUser {
  const { passwordHash: _omit, failedLoginCount: _fails, lockedUntil: _lock, ...safe } = user;
  return safe;
}

export function publicUsers(users: User[]): PublicUser[] {
  return users.map(publicUser);
}
