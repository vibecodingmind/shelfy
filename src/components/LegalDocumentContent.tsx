import React from 'react';
import { LEGAL_PAGES } from '../content/legal.js';

export function LegalDocumentContent({ slug }: { slug: string }) {
  const page = LEGAL_PAGES[slug] || LEGAL_PAGES.terms;
  return (
    <>
      <h2 className="text-xl font-bold text-[var(--shelfy-fg)] pr-8">{page.title}</h2>
      <div className="mt-4 text-sm text-[var(--shelfy-muted)] leading-relaxed space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
        {page.body.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-[var(--shelfy-fg)]/90">
            {paragraph}
          </p>
        ))}
      </div>
    </>
  );
}

export function legalTitleForSlug(slug: string): string {
  return (LEGAL_PAGES[slug] || LEGAL_PAGES.terms).title;
}
