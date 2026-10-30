/** User-facing steps after "Book a shelf" on the listing page. */
export const SHELF_BOOKING_FLOW_STEPS = [
  'Choose your start date, rental length (1–12 months), and product category.',
  'Tap Book a shelf — Shelfy creates your booking request for those dates.',
  'If the shop must approve first, wait for approval (you get a notification). When payment is open, checkout shows rent, Shelfy fee, and total.',
  'Pay with Azam Pay (M-Pesa, Tigo Pesa, Airtel Money, Halopesa, or AzamPesa). Payment is confirmed only after Azam Pay verifies funds on your phone.',
  'The host confirms placement on the shelf. Your booking becomes active for the rental period — track it in your vendor portal and chat with the host anytime.',
] as const;

export const BOOK_SHELF_LABEL = 'Book a shelf';
export const SIGN_IN_TO_BOOK_LABEL = 'Sign in to book a shelf';
