import React from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Notification } from '../types/index.js';
import { useI18n } from '../i18n/context.js';

interface NotificationInboxProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (ids?: string[]) => void;
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({
  open,
  onClose,
  notifications,
  onMarkRead,
}) => {
  const { t } = useI18n();
  if (!open) return null;

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end p-4 pt-20 sm:pt-24">
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white">
            <Bell className="w-4 h-4 text-emerald-400" />
            {t('notifications')}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMarkRead()}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {t('markAllRead')}
            </button>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">{t('noNotifications')}</p>
          ) : (
            sorted.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-slate-800/80 ${n.readAt ? 'opacity-70' : 'bg-slate-950/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{n.title}</div>
                    <div className="text-xs text-slate-300 mt-1">{n.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.readAt && (
                    <button
                      type="button"
                      onClick={() => onMarkRead([n.id])}
                      className="shrink-0 p-1 rounded-lg bg-emerald-500/20 text-emerald-400"
                      title={t('markAllRead')}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
