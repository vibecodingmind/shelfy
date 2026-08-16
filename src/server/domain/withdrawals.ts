export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export interface Withdrawal {
  id: string;
  hostId: string;
  amountTzs: number;
  method: string;
  status: WithdrawalStatus;
  payoutReference?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

const IN_FLIGHT: WithdrawalStatus[] = ['PENDING', 'APPROVED', 'PROCESSING'];

export function quoteWithdrawal(input: {
  amountTzs: number;
  availableTzs: number;
  minWithdrawalTzs: number;
  existing: Withdrawal[];
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(input.amountTzs) || input.amountTzs <= 0) {
    return { ok: false, message: 'Enter a valid withdrawal amount.' };
  }
  if (input.amountTzs < input.minWithdrawalTzs) {
    return { ok: false, message: `Minimum withdrawal is TZS ${input.minWithdrawalTzs.toLocaleString()}.` };
  }
  if (input.amountTzs > input.availableTzs) {
    return { ok: false, message: 'Cannot withdraw more than the available (settled) balance.' };
  }
  if (input.existing.some((w) => IN_FLIGHT.includes(w.status))) {
    return { ok: false, message: 'A withdrawal is already in progress.' };
  }
  return { ok: true };
}
