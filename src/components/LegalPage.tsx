import React from 'react';
import { LEGAL_PAGES } from '../content/legal.js';

const PAGES = LEGAL_PAGES;

export function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const page = PAGES[slug] || PAGES.terms;
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-xs text-emerald-400 mb-6">← Back to marketplace</button>
      <h1 className="text-2xl font-black mb-4">{page.title}</h1>
      <div className="text-sm text-slate-300 leading-relaxed space-y-4">
        {page.body.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

export const LEGAL_SLUGS = Object.keys(PAGES);
