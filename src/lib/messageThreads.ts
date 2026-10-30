import { Booking, Message, Shop, User } from '../types/index.js';

export interface InboxThread {
  id: string;
  label: string;
  subtitle: string;
  shopId?: string;
  bookingId?: string;
  peerId: string;
  unread: number;
  lastAt: string;
}

export function buildMessageThreads(
  user: User,
  messages: Message[],
  shops: Shop[],
  bookings: Booking[]
): InboxThread[] {
  const map = new Map<string, InboxThread>();

  for (const m of messages) {
    const peerId = m.senderId === user.id ? m.receiverId : m.senderId;
    const key = m.shopId ? `shop:${m.shopId}:${peerId}` : m.bookingId ? `bk:${m.bookingId}` : `peer:${peerId}`;
    const shop = m.shopId ? shops.find((s) => s.id === m.shopId) : undefined;
    const booking = m.bookingId ? bookings.find((b) => b.id === m.bookingId) : undefined;
    const label = booking?.shelfName || shop?.name || m.senderName;
    const subtitle = m.shopId ? 'Shop listing' : booking ? `Booking · ${booking.status}` : 'Message';
    const unread = m.receiverId === user.id && !m.readAt ? 1 : 0;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: key,
        label,
        subtitle,
        shopId: m.shopId,
        bookingId: m.bookingId,
        peerId,
        unread,
        lastAt: m.createdAt,
      });
    } else {
      existing.unread += unread;
      if (m.createdAt > existing.lastAt) existing.lastAt = m.createdAt;
    }
  }

  return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function shopThreadId(shopId: string, hostId: string): string {
  return `shop:${shopId}:${hostId}`;
}

export function bookingThreadId(bookingId: string): string {
  return `bk:${bookingId}`;
}
