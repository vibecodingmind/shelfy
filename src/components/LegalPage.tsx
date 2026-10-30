import React from 'react';
import { LEGAL_PAGES } from '../content/legal.js';
import { LegalDocumentContent } from './LegalDocumentContent.js';

export function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-3xl mx-auto overflow-x-hidden">
      <button onClick={onBack} className="text-xs text-emerald-400 mb-6">← Back to marketplace</button>
      <LegalDocumentContent slug={slug} />
    </div>
  );
}

export const LEGAL_SLUGS = Object.keys(LEGAL_PAGES);
