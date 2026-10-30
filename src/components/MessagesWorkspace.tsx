import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { Booking, Message, Shop, User } from '../types/index.js';
import { buildMessageThreads, InboxThread } from '../lib/messageThreads.js';
import { api } from '../lib/api.js';

interface MessagesWorkspaceProps {
  user: User;
  messages: Message[];
  shops: Shop[];
  bookings: Booking[];
  onSent: () => void;
  /** Embedded in vendor/host portal vs full-page */
  variant?: 'portal' | 'standalone';
  onBack?: () => void;
  initialThreadId?: string | null;
  onInitialThreadConsumed?: () => void;
}

function threadMessages(user: User, messages: Message[], thread: InboxThread | null): Message[] {
  if (!thread) return [];
  return messages
    .filter((m) => {
      if (m.senderId !== user.id && m.receiverId !== user.id) return false;
      if (thread.bookingId) return m.bookingId === thread.bookingId;
      if (thread.shopId) {
        return (
          m.shopId === thread.shopId &&
          (m.senderId === thread.peerId || m.receiverId === thread.peerId)
        );
      }
      return m.senderId === thread.peerId || m.receiverId === thread.peerId;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const MessagesWorkspace: React.FC<MessagesWorkspaceProps> = ({
  user,
  messages,
  shops,
  bookings,
  onSent,
  variant = 'standalone',
  onBack,
  initialThreadId,
  onInitialThreadConsumed,
}) => {
  const threads = useMemo(
    () => buildMessageThreads(user, messages, shops, bookings),
    [user, messages, shops, bookings]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId]
  );

  const thread = useMemo(() => threadMessages(user, messages, selected), [user, messages, selected]);

  useEffect(() => {
    if (!initialThreadId || threads.length === 0) return;
    const match = threads.find((t) => t.id === initialThreadId);
    if (match) {
      setSelectedId(match.id);
      onInitialThreadConsumed?.();
    }
  }, [initialThreadId, threads, onInitialThreadConsumed]);

  useEffect(() => {
    if (!selected) return;
    void api
      .markMessagesRead({
        shopId: selected.shopId,
        bookingId: selected.bookingId,
        peerId: selected.peerId,
      })
      .then(() => onSent());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark read when thread changes
  }, [selected?.id]);

  const portal = variant === 'portal';
  const showListOnMobile = !selectedId;
  const unreadTotal = threads.reduce((n, t) => n + t.unread, 0);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !content.trim()) return;
    setSending(true);
    setError('');
    const res = await api.sendMessage({
      receiverId: selected.peerId,
      shopId: selected.shopId,
      bookingId: selected.bookingId,
      content: content.trim(),
    });
    setSending(false);
    if (res.success) {
      setContent('');
      onSent();
    } else {
      setError(res.error?.message || 'Could not send message.');
    }
  };

  const shellClass = portal
    ? 'bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[min(70vh,640px)] flex flex-col'
    : 'rounded-2xl border border-[var(--shelfy-border)] bg-[var(--shelfy-card-bg)] overflow-hidden shadow-sm min-h-[min(70vh,640px)] flex flex-col';

  const listPaneClass = portal ? 'bg-slate-950/50 border-slate-800' : 'bg-[var(--shelfy-elevated)]/30 border-[var(--shelfy-border)]';
  const textMuted = portal ? 'text-slate-400' : 'text-[var(--shelfy-muted)]';
  const textFg = portal ? 'text-white' : 'text-[var(--shelfy-fg)]';

  return (
    <div className={variant === 'standalone' ? 'w-full max-w-5xl mx-auto' : 'w-full'}>
      {variant === 'standalone' && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--shelfy-muted)] hover:text-[var(--shelfy-fg)] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {variant === 'standalone' && (
        <header className="mb-4">
          <h1 className={`text-2xl font-extrabold flex items-center gap-3 ${textFg}`}>
            <MessageSquare className="w-7 h-7 text-emerald-500 shrink-0" />
            Messages
            {unreadTotal > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500 text-slate-950">{unreadTotal} new</span>
            )}
          </h1>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Conversations with shop hosts and booking threads in one place.
          </p>
        </header>
      )}

      <div className={`${shellClass} md:flex-row flex flex-col flex-1`}>
        {/* Thread list */}
        <div
          className={`md:w-[min(100%,320px)] md:shrink-0 border-b md:border-b-0 md:border-r flex flex-col ${
            showListOnMobile ? 'flex' : 'hidden md:flex'
          } ${listPaneClass}`}
        >
          <div className={`px-4 py-3 border-b ${portal ? 'border-slate-800' : 'border-[var(--shelfy-border)]'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>Inbox</div>
            <div className={`text-sm font-semibold ${textFg}`}>
              {threads.length === 0 ? 'No chats yet' : `${threads.length} conversation${threads.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <ul className="overflow-y-auto flex-1 max-h-[50vh] md:max-h-none">
            {threads.length === 0 ? (
              <li className={`text-sm text-center py-12 px-4 ${textMuted}`}>
                Message a shop from the marketplace, or open a booking and start a thread with the host.
              </li>
            ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors border-l-2 ${
                      selectedId === t.id
                        ? portal
                          ? 'bg-slate-800/80 border-amber-400'
                          : 'bg-[var(--shelfy-elevated)] border-emerald-500'
                        : portal
                          ? 'border-transparent hover:bg-slate-800/50'
                          : 'border-transparent hover:bg-[var(--shelfy-elevated)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`font-semibold text-sm truncate ${textFg}`}>{t.label}</div>
                        <div className={`text-[11px] mt-0.5 ${textMuted}`}>{t.subtitle}</div>
                      </div>
                      {t.unread > 0 && (
                        <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                          {t.unread > 9 ? '9+' : t.unread}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Chat pane */}
        <div className={`flex-1 flex flex-col min-h-[320px] ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
          {!selected ? (
            <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${textMuted}`}>
              <MessageSquare className="w-12 h-12 text-emerald-500/40 mb-3" />
              <p className={`text-sm font-medium ${textFg}`}>Select a conversation</p>
              <p className="text-xs mt-1 max-w-xs">Pick a thread on the left to read and reply.</p>
            </div>
          ) : (
            <>
              <div
                className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${
                  portal ? 'border-slate-800 bg-slate-950/30' : 'border-[var(--shelfy-border)]'
                }`}
              >
                <button
                  type="button"
                  className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                  onClick={() => setSelectedId(null)}
                  aria-label="Back to inbox"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`font-bold text-sm truncate ${textFg}`}>{selected.label}</div>
                  <div className={`text-[11px] ${textMuted}`}>{selected.subtitle}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.length === 0 ? (
                  <p className={`text-sm text-center py-10 ${textMuted}`}>
                    No messages yet. Say hello — the other party gets a notification when you send.
                  </p>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl text-sm border max-w-[92%] ${
                        m.senderId === user.id
                          ? 'ml-auto bg-emerald-500/15 border-emerald-500/30'
                          : portal
                            ? 'mr-auto bg-slate-950 border-slate-700'
                            : 'mr-auto bg-[var(--shelfy-elevated)] border-[var(--shelfy-border)]'
                      }`}
                    >
                      <div className={`font-semibold text-xs ${textFg}`}>{m.senderName}</div>
                      <p className={`mt-1 ${portal ? 'text-slate-200' : ''}`}>{m.content}</p>
                      <div className={`text-[10px] mt-1 ${textMuted}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSend}
                className={`p-3 border-t flex gap-2 shrink-0 ${portal ? 'border-slate-800 bg-slate-950/40' : 'border-[var(--shelfy-border)]'}`}
              >
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your message…"
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm border focus:outline-none focus:border-emerald-500 ${
                    portal
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-[var(--shelfy-input-bg)] border-[var(--shelfy-border)] text-[var(--shelfy-fg)]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
              {error && <p className="px-4 pb-2 text-xs text-rose-400">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
