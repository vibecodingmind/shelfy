import { calculateBookingQuote } from './pricing.js';

export interface CheckoutLineItem {
  shelfId: string;
  durationMonths: number;
  startDate?: string;
}

export interface CheckoutQuote {
  items: Array<{
    shelfId: string;
    shelfName: string;
    monthlyPriceTzs: number;
    durationMonths: number;
    totalPriceTzs: number;
    platformFeeTzs: number;
    hostEarningsTzs: number;
  }>;
  grandTotalTzs: number;
  totalPlatformFeeTzs: number;
}

export function quoteMultiCheckout(input: {
  lines: CheckoutLineItem[];
  shelves: Array<{ id: string; name: string; monthlyPriceTzs: number }>;
  commissionPercentage: number;
}): CheckoutQuote {
  const items = input.lines.map((line) => {
    const shelf = input.shelves.find((s) => s.id === line.shelfId);
    const quote = calculateBookingQuote({
      monthlyPriceTzs: shelf?.monthlyPriceTzs || 0,
      durationMonths: line.durationMonths,
      commissionPercentage: input.commissionPercentage,
    });
    return {
      shelfId: line.shelfId,
      shelfName: shelf?.name || line.shelfId,
      ...quote,
    };
  });

  return {
    items,
    grandTotalTzs: items.reduce((s, i) => s + i.totalPriceTzs + i.platformFeeTzs, 0),
    totalPlatformFeeTzs: items.reduce((s, i) => s + i.platformFeeTzs, 0),
  };
}
