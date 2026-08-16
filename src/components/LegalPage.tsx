import React from 'react';

const PAGES: Record<string, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    body: 'LEGAL_REVIEW_REQUIRED — This is a placeholder for Shelfy’s platform terms. It does not create legal rights or claim regulatory compliance.',
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'LEGAL_REVIEW_REQUIRED — Placeholder describing how account, booking, and payment data will be handled. Have counsel review before launch.',
  },
  'vendor-agreement': {
    title: 'Vendor Agreement',
    body: 'LEGAL_REVIEW_REQUIRED — Vendors rent shelf space and retain ownership of products they place. Shelfy is not the seller of those products.',
  },
  'host-agreement': {
    title: 'Host Agreement',
    body: 'LEGAL_REVIEW_REQUIRED — Hosts provide physical space and do not take title to vendor goods by hosting.',
  },
  'shelf-rental': {
    title: 'Shelf Rental Terms',
    body: 'LEGAL_REVIEW_REQUIRED — The V1 product is time-boxed shelf occupancy, not consignment or POS.',
  },
  cancellation: {
    title: 'Cancellation Policy',
    body: 'LEGAL_REVIEW_REQUIRED — Unpaid bookings cancel at no charge. Paid unused bookings may refund minus a configurable fee. After the free-cancel window, rent already earned stays with the host.',
  },
  refund: {
    title: 'Refund Policy',
    body: 'LEGAL_REVIEW_REQUIRED — Refunds are posted only through the ledger after a valid cancellation or admin decision.',
  },
  payout: {
    title: 'Payout Policy',
    body: 'LEGAL_REVIEW_REQUIRED — Hosts may withdraw available (settled) balances above the minimum. Pending and disputed amounts cannot be withdrawn.',
  },
  dispute: {
    title: 'Dispute Policy',
    body: 'LEGAL_REVIEW_REQUIRED — Disputes are reviewed by admin with evidence. Financial adjustments are ledger entries, not informal balance edits.',
  },
};

export function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const page = PAGES[slug] || PAGES.terms;
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-xs text-emerald-400 mb-6">← Back to marketplace</button>
      <h1 className="text-2xl font-black mb-4">{page.title}</h1>
      <p className="text-sm text-slate-300 leading-relaxed">{page.body}</p>
    </div>
  );
}

export const LEGAL_SLUGS = Object.keys(PAGES);
