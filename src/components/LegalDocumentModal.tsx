import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { LegalDocumentContent, legalTitleForSlug } from './LegalDocumentContent.js';

interface LegalDocumentModalProps {
  slug: string | null;
  onClose: () => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ slug, onClose }) => {
  useEffect(() => {
    if (!slug) return;
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
  }, [slug, onClose]);

  if (!slug) return null;

  const title = legalTitleForSlug(slug);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-doc-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg bg-[var(--shelfy-bg)] border border-[var(--shelfy-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-h-[92vh] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--shelfy-elevated)] text-[var(--shelfy-muted)] hover:text-[var(--shelfy-fg)]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div id="legal-doc-title" className="sr-only">
          {title}
        </div>
        <LegalDocumentContent slug={slug} />
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl border border-[var(--shelfy-border)] text-sm font-semibold text-[var(--shelfy-fg)] hover:bg-[var(--shelfy-elevated)]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export type LegalModalSlug = 'cancellation' | 'payout' | 'terms';
