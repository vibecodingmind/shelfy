import React, { useMemo } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Booking, Message, Shop, User } from '../types/index.js';
import { buildMessageThreads, InboxThread } from '../lib/messageThreads.js';

export type { InboxThread };

interface MessageInboxModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  messages: Message[];
  shops: Shop[];
  bookings: Booking[];
  onOpenThread: (thread: InboxThread) => void;
}

export const MessageInboxModal: React.FC<MessageInboxModalProps> = ({
  open,
  onClose,
  user,
  messages,
  shops,
  bookings,
  onOpenThread,
}) => {
  const threads = useMemo(() => buildMessageThreads(user, messages, shops, bookings), [user, messages, shops, bookings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--shelfy-bg)] border border-[var(--shelfy-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--shelfy-border)]">
          <h2 className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            Messages
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--shelfy-elevated)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {threads.length === 0 ? (
            <p className="text-sm text-[var(--shelfy-muted)] text-center py-10 px-4">
              No conversations yet. Open a shelf and use Message shop host, or message from a booking in your portal.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onOpenThread(t);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-[var(--shelfy-elevated)] border border-transparent hover:border-[var(--shelfy-border)] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{t.label}</div>
                  <div className="text-xs text-[var(--shelfy-muted)]">{t.subtitle}</div>
                </div>
                {t.unread > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                    {t.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
