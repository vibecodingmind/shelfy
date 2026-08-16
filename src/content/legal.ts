/** Platform legal copy — have Tanzania counsel confirm before relying on this in court. */

const COUNSEL_NOTE =
  'This document describes how Shelfy operates today. It is not legal advice. Have qualified counsel in Tanzania review before you rely on it for regulatory or contractual disputes.';

export const LEGAL_PAGES: Record<string, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    body: `${COUNSEL_NOTE}

Shelfy Tanzania Ltd ("Shelfy", "we", "us") operates an online marketplace that connects retail hosts with product vendors who rent physical shelf space. By creating an account or using shelfy.co.tz you agree to these Terms.

Shelfy provides software to list shelf space, request bookings, collect payments through PesaPal, and record settlements in an append-only ledger. Shelfy is not the seller of vendor products and does not take title to goods placed on a host shelf.

You must provide accurate registration information, keep credentials confidential, and use the platform only for lawful shelf-rental activity in Tanzania. We may suspend accounts that violate these Terms, attempt fraud, or abuse other users.

Bookings follow the approve-then-pay flow unless platform settings say otherwise: a host may approve a vendor request before payment is initiated. Payment confirmation comes only from PesaPal server verification or an administrator — never from a browser-only "I paid" button.

Fees, commissions, and payout timing are shown at checkout and in your dashboard. Disputes are handled through the in-app dispute workflow; Shelfy may adjust ledger entries after review but does not guarantee a particular outcome.

We may update these Terms. Material changes will be posted on this page. Continued use after the effective date constitutes acceptance.`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `${COUNSEL_NOTE}

Shelfy collects account data (name, email, phone, business details), booking and payment records, uploaded photos, GPS check-in coordinates for field visits, and technical logs (IP address, user agent, request timestamps).

We use this data to operate the marketplace, prevent fraud, reconcile PesaPal payments, send notifications you request, and comply with lawful requests from authorities.

Payment card and mobile-money details are processed by PesaPal; Shelfy stores transaction references and amounts, not full payment instrument numbers.

Email and SMS are sent only when you configure a provider (for example Resend) or when in-app notifications are generated. If no email provider is configured at registration, Shelfy may auto-verify email so you can use the product — see /api/health onboarding flags.

We retain records needed for accounting, disputes, and audit. You may request access or correction by contacting support@shelfy.co.tz. We do not sell personal data to third-party advertisers.`,
  },
  'vendor-agreement': {
    title: 'Vendor Agreement',
    body: `${COUNSEL_NOTE}

As a Vendor you rent shelf space for a defined period. You retain ownership of products you place unless a separate written agreement says otherwise. Shelfy is not your agent for retail sales to shoppers.

You are responsible for product quality, labelling, expiry, pricing to consumers (where you sell directly in-store), and compliance with applicable Tanzania food, cosmetic, and trade rules.

You must not place prohibited or counterfeit goods. Hosts may report issues through field visits and disputes.

Booking payment does not transfer shelf ownership — only time-bound occupancy rights for the booked dates. Overlapping bookings are blocked by the platform.

If a booking is cancelled according to the cancellation policy, refunds flow through the ledger after admin or automated rules apply — not as informal balance edits.`,
  },
  'host-agreement': {
    title: 'Host Agreement',
    body: `${COUNSEL_NOTE}

As a Host you offer physical shelf space in your shop. You do not acquire ownership of vendor goods by listing space or accepting a booking.

You must accurately describe your shop location, photos, and shelf dimensions. Approving a booking means you commit to making the booked shelf available for the stated dates.

You receive host earnings minus the platform commission shown at booking time. Earnings move from pending to available according to booking completion and dispute status.

You may reject booking requests before payment. After payment, cancellations follow the cancellation and refund policies.

Field agents may visit on assigned schedules; check-in requires GPS proximity to your shop coordinates.`,
  },
  'shelf-rental': {
    title: 'Shelf Rental Terms',
    body: `${COUNSEL_NOTE}

Shelfy V1 is shelf-space rental only — not consignment, not POS, and not inventory purchasing by Shelfy.

A booking grants the vendor the right to occupy the named shelf for the start and end dates shown at checkout. Dates use calendar-day ranges; overlapping active bookings on the same shelf are not permitted.

Monthly price, duration, platform fee, and host earnings are calculated at booking creation and stored on the booking record.

The vendor must remove products when the booking ends unless a renewal is paid and active. Hosts must not re-rent the same shelf dates to another vendor while a blocking booking exists.`,
  },
  cancellation: {
    title: 'Cancellation Policy',
    body: `${COUNSEL_NOTE}

Unpaid bookings (pending approval or payment) may be cancelled without charge by the vendor or host according to the booking state machine.

Paid bookings may qualify for a refund minus a cancellation fee during the free-cancel window (default 7 days from booking start unless settings change). After that window, rent already earned is allocated to the host per ledger rules.

Cancellation quotes shown in the app are authoritative for the platform fee and refund split. Hosts and vendors should not arrange side payments outside Shelfy for the same booking period.`,
  },
  refund: {
    title: 'Refund Policy',
    body: `${COUNSEL_NOTE}

Refunds are issued only after a valid cancellation, dispute resolution, or administrator decision. All money movement is recorded as balanced ledger entries — Shelfy does not edit balances informally.

Failed or reversed PesaPal transactions map to payment failed or refunded statuses; bookings do not activate until payment is verified COMPLETED through PesaPal GetTransactionStatus or IPN.

Partial refunds may apply when a cancellation fee is configured. Currency is Tanzanian Shillings (TZS) unless explicitly stated otherwise.`,
  },
  payout: {
    title: 'Payout Policy',
    body: `${COUNSEL_NOTE}

Hosts may request withdrawal of available (settled) balances above the minimum threshold (default TZS 20,000). Pending earnings tied to active bookings and amounts under dispute are not withdrawable.

Only one in-flight withdrawal is allowed at a time. Administrators mark payouts processing, completed, or failed; failed payouts reverse the hold in the ledger.

Shelfy does not guarantee same-day mobile-money delivery — timing depends on your payout method and operational review.`,
  },
  dispute: {
    title: 'Dispute Policy',
    body: `${COUNSEL_NOTE}

Either party may open a dispute with evidence (photos, field reports, messages). While disputed, affected bookings may block payouts.

Administrators review disputes and may adjust ledger entries — for example partial refunds or host compensation — but Shelfy does not automatically assign criminal liability.

Damage to host fixtures, theft, or expired goods should be documented promptly. Resolution timelines depend on evidence quality and both parties' responses.`,
  },
};

export const PLATFORM_POLICIES = {
  damage:
    'Physical damage to host fixtures or vendor goods is handled through the dispute workflow with photos and field reports. Shelfy records financial adjustments in the ledger; it does not automatically assign legal liability.',
  theft:
    'Theft or unexplained loss must be reported through a dispute with evidence (photos, timestamps, witness notes). Shelfy does not automatically debit either party without administrator review.',
  expiry:
    'Expired or non-compliant goods remain the vendor’s responsibility unless a separate written service agreement says otherwise. Hosts may report expiry issues via field visits.',
  shelfRentalTerms:
    'The vendor rents shelf space for a defined period only. Product title stays with the vendor. Shelfy is not the retailer of those products.',
};
