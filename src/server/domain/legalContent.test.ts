import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES, PLATFORM_POLICIES } from '../../content/legal.js';

describe('legal content', () => {
  it('ships substantive copy without LEGAL_REVIEW_REQUIRED placeholders', () => {
    for (const [slug, page] of Object.entries(LEGAL_PAGES)) {
      expect(page.title.length).toBeGreaterThan(3);
      expect(page.body).not.toContain('LEGAL_REVIEW_REQUIRED');
      expect(page.body.length).toBeGreaterThan(200);
      expect(slug).toMatch(/^[a-z-]+$/);
    }
    for (const text of Object.values(PLATFORM_POLICIES)) {
      expect(text).not.toContain('LEGAL_REVIEW_REQUIRED');
    }
  });
});
