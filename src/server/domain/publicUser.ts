import { User } from '../../types/index.js';

export type PublicUser = Omit<User, 'passwordHash'>;

export function publicUser(user: User): PublicUser {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

export function publicUsers(users: User[]): PublicUser[] {
  return users.map(publicUser);
}
