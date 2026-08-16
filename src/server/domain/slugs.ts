export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return slug || 'listing';
}

export function uniqueSlug(source: string, existing: string[]): string {
  const taken = new Set(existing.filter(Boolean));
  const root = slugify(source);
  if (!taken.has(root)) return root;
  let index = 2;
  while (taken.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

export function findByIdOrSlug<T extends { id: string; slug?: string }>(rows: T[], idOrSlug: string): T | undefined {
  return rows.find((row) => row.id === idOrSlug || row.slug === idOrSlug);
}
