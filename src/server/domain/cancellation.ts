import { BookingStatus, UserRole } from '../../types/index.js';

export interface CancellationInput {
  status: BookingStatus;
  paymentStatus: string;
  startDate: string;
  totalPriceTzs: number;
  platformFeeTzs: number;
  hostEarningsTzs: number;
  actor: UserRole | 'SYSTEM';
  now?: Date;
  freeCancelDays?: number;
  cancellationFeePercent?: number;
}

export interface CancellationQuote {
  allowed: boolean;
  reason?: string;
  refundVendorTzs: number;
  cancellationFeeTzs: number;
  reverseHostTzs: number;
  reverseCommissionTzs: number;
  hostKeepsTzs: number;
  moneyMoved: boolean;
}

const TERMINAL: BookingStatus[] = ['CANCELLED', 'REJECTED', 'COMPLETED'];

function daysUntil(startDate: string, now: Date): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  return Math.ceil((start - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function quoteCancellation(input: CancellationInput): CancellationQuote {
  const now = input.now || new Date();
  const freeDays = input.freeCancelDays ?? 7;
  const feePercent = input.cancellationFeePercent ?? 10;
  const none: CancellationQuote = {
    allowed: false,
    refundVendorTzs: 0,
    cancellationFeeTzs: 0,
    reverseHostTzs: 0,
    reverseCommissionTzs: 0,
    hostKeepsTzs: 0,
    moneyMoved: false,
  };

  if (TERMINAL.includes(input.status)) {
    return { ...none, reason: `A ${input.status} booking cannot be cancelled.` };
  }

  const paid = input.paymentStatus === 'PAID' || ['PAID', 'ACTIVE', 'EXPIRING'].includes(input.status);
  if (!paid) {
    return {
      allowed: true,
      refundVendorTzs: 0,
      cancellationFeeTzs: 0,
      reverseHostTzs: 0,
      reverseCommissionTzs: 0,
      hostKeepsTzs: 0,
      moneyMoved: false,
    };
  }

  if (input.actor === 'HOST' || input.status === 'PAID') {
    return {
      allowed: true,
      refundVendorTzs: input.totalPriceTzs,
      cancellationFeeTzs: 0,
      reverseHostTzs: input.hostEarningsTzs,
      reverseCommissionTzs: input.platformFeeTzs,
      hostKeepsTzs: 0,
      moneyMoved: true,
    };
  }

  const untilStart = daysUntil(input.startDate, now);
  if (untilStart >= freeDays) {
    const fee = Math.round(input.totalPriceTzs * (feePercent / 100));
    return {
      allowed: true,
      refundVendorTzs: input.totalPriceTzs - fee,
      cancellationFeeTzs: fee,
      reverseHostTzs: input.hostEarningsTzs,
      reverseCommissionTzs: input.platformFeeTzs,
      hostKeepsTzs: 0,
      moneyMoved: true,
    };
  }

  return {
    allowed: true,
    refundVendorTzs: 0,
    cancellationFeeTzs: 0,
    reverseHostTzs: 0,
    reverseCommissionTzs: 0,
    hostKeepsTzs: input.hostEarningsTzs,
    moneyMoved: false,
  };
}
