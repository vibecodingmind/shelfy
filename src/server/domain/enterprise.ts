import { EnterpriseAccount, User } from '../../types/index.js';
import { newId } from './ids.js';

export function createEnterpriseAccount(input: {
  owner: User;
  brandName: string;
  businessRegistration?: string;
  billingEmail: string;
}): EnterpriseAccount {
  const now = new Date().toISOString();
  return {
    id: newId('ent'),
    ownerUserId: input.owner.id,
    brandName: input.brandName.trim(),
    businessRegistration: input.businessRegistration?.trim(),
    memberUserIds: [input.owner.id],
    billingEmail: input.billingEmail.trim().toLowerCase(),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
}

export function userInEnterprise(account: EnterpriseAccount, userId: string): boolean {
  return account.memberUserIds.includes(userId) || account.ownerUserId === userId;
}

export function addEnterpriseMember(account: EnterpriseAccount, userId: string): EnterpriseAccount {
  if (account.memberUserIds.includes(userId)) return account;
  return {
    ...account,
    memberUserIds: [...account.memberUserIds, userId],
    updatedAt: new Date().toISOString(),
  };
}
