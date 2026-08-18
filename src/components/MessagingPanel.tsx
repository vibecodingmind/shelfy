import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Booking, Message, User } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

interface MessagingPanelProps {
  user: User;
  bookings: Booking[];
  messages: Message[];
  onSent: () => void;
}

export const MessagingPanel: React.FC<MessagingPanelProps> = ({ user, bookings, messages, onSent }) => {
  const { t } = useI18n();
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const myBookings = useMemo(
    () =>
      bookings.filter((b) => {
        if (user.role === 'VENDOR') return b.vendorId === user.id;
        if (user.role === 'HOST') return b.hostId === user.id;
        return true;
      }),
    [bookings, user]
  );

  const thread = useMemo(() => {
    if (!selectedBookingId) return messages.slice(-20);
    return messages.filter((m) => m.bookingId === selectedBookingId);
  }, [messages, selectedBookingId]);

  const receiverId = useMemo(() => {
    const booking = myBookings.find((b) => b.id === selectedBookingId);
    if (!booking) return '';
    return user.role === 'VENDOR' ? booking.hostId : booking.vendorId;
  }, [myBookings, selectedBookingId, user.role]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !receiverId) {
      setError('Select a booking and enter a message.');
      return;
    }
    setSending(true);
    setError('');
    const res = await api.sendMessage({
      receiverId,
      bookingId: selectedBookingId || undefined,
      content: content.trim(),
    });
    setSending(false);
    if (res.success) {
      setContent('');
      onSent();
    } else {
      setError(res.error?.message || 'Failed to send message.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Booking thread</label>
        <select
          value={selectedBookingId}
          onChange={(e) => setSelectedBookingId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
        >
          <option value="">All messages</option>
          {myBookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.shelfName} — {b.status}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {thread.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No messages in this thread.</p>
        ) : (
          thread.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-xl text-xs border ${
                m.senderId === user.id
                  ? 'bg-emerald-500/10 border-emerald-500/30 ml-4'
                  : 'bg-slate-950 border-slate-800 mr-4'
              }`}
            >
              <div className="font-bold text-white">{m.senderName}</div>
              <div className="text-slate-300 mt-1">{m.content}</div>
              <div className="text-[10px] text-slate-500 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('messagePlaceholder')}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> {t('sendMessage')}
        </button>
      </form>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
};
