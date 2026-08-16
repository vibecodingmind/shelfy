export function paymentsDueForReconcile(input: {
  payments: Array<{ id: string; status: string; pesapalTrackingId?: string; createdAt: string }>;
  now?: Date;
  minAgeMinutes?: number;
}): string[] {
  const now = input.now || new Date();
  const minAgeMs = (input.minAgeMinutes ?? 2) * 60 * 1000;
  return input.payments
    .filter((payment) => {
      if (payment.status !== 'PENDING') return false;
      if (!payment.pesapalTrackingId) return false;
      const created = new Date(payment.createdAt).getTime();
      if (Number.isNaN(created)) return false;
      return now.getTime() - created >= minAgeMs;
    })
    .map((payment) => payment.id);
}
