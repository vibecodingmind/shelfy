import React, { useEffect, useMemo, useState } from 'react';
import { X, Send } from 'lucide-react';
import { Message, Shop, User } from '../types/index.js';
import { api } from '../lib/api.js';

export interface MessageChatContext {
  shopId?: string;
  bookingId?: string;
  shelfId?: string;
  shelfName?: string;
  hostId: string;
  hostName?: string;
  shopName?: string;
  threadLabel?: string;
}

interface MessageChatModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  context: MessageChatContext | null;
  messages: Message[];
  onSent: () => void;
}

export const MessageChatModal: React.FC<MessageChatModalProps> = ({
  open,
  onClose,
  user,
  context,
  messages,
  onSent,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !context) return;
    setContent('');
    setError('');
    void api
      .markMessagesRead({
        shopId: context.shopId,
        bookingId: context.bookingId,
        peerId: context.hostId,
      })
      .then(() => onSent());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when opening a thread
  }, [open, context?.shopId, context?.bookingId, context?.hostId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const thread = useMemo(() => {
    if (!context) return [];
    return messages
      .filter((m) => {
        if (m.senderId !== user.id && m.receiverId !== user.id) return false;
        if (context.bookingId) return m.bookingId === context.bookingId;
        if (context.shopId) {
          return (
            m.shopId === context.shopId &&
            (m.senderId === context.hostId || m.receiverId === context.hostId)
          );
        }
        return m.senderId === context.hostId || m.receiverId === context.hostId;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, context, user.id]);

  if (!open || !context) return null;

  const title =
    context.threadLabel ||
    (context.shelfName
      ? `Message ${context.hostName || 'shop host'}`
      : `Message ${context.shopName || 'host'}`);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSending(true);
    setError('');
    const res = await api.sendMessage({
      receiverId: context.hostId,
      shopId: context.shopId,
      shelfId: context.shelfId,
      bookingId: context.bookingId,
      content: text,
    });
    setSending(false);
    if (res.success) {
      setContent('');
      onSent();
    } else {
      setError(res.error?.message || 'Could not send message.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--shelfy-bg)] border border-[var(--shelfy-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[min(85vh,560px)]">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--shelfy-border)]">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--shelfy-fg)]">{title}</h2>
            <p className="text-xs text-[var(--shelfy-muted)] mt-0.5 truncate">
              {context.shopName}
              {context.shelfName ? ` · ${context.shelfName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--shelfy-elevated)] text-[var(--shelfy-muted)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
          {thread.length === 0 ? (
            <p className="text-sm text-[var(--shelfy-muted)] text-center py-8">
              Ask about shelf availability, dimensions, or stocking rules. The host is notified when you send a message.
            </p>
          ) : (
            thread.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl text-sm border max-w-[90%] ${
                  m.senderId === user.id
                    ? 'ml-auto bg-emerald-500/15 border-emerald-500/30'
                    : 'mr-auto bg-[var(--shelfy-elevated)] border-[var(--shelfy-border)]'
                }`}
              >
                <div className="font-semibold text-xs text-[var(--shelfy-fg)]">{m.senderName}</div>
                <p className="mt-1 text-[var(--shelfy-fg)]">{m.content}</p>
                <div className="text-[10px] text-[var(--shelfy-muted)] mt-1">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-[var(--shelfy-border)] flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message…"
            className="flex-1 bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--shelfy-fg)]"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
        {error && <p className="px-4 pb-3 text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  );
};
