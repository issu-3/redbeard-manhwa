export const CONTENT_TYPES = [
  'MANHWA',
  'MANGA',
  'MANHUA',
  'WEBTOON',
  'COMIC',
  'LIGHT_NOVEL',
  'DOUJINSHI',
  'PORNHWA'
] as const;

export type ContentType = typeof CONTENT_TYPES[number];

export function getContentTypeLabel(type: string | undefined | null): string {
  if (!type) return 'Series';
  
  switch (type.toUpperCase()) {
    case 'MANHWA': return 'Manhwa';
    case 'MANGA': return 'Manga';
    case 'MANHUA': return 'Manhua';
    case 'WEBTOON': return 'Webtoon';
    case 'COMIC': return 'Comic';
    case 'LIGHT_NOVEL': return 'Light Novel';
    case 'DOUJINSHI': return 'Doujinshi';
    case 'PORNHWA': return 'Pornhwa';
    default: return type || 'Series';
  }
}

export function getContentTypeSlug(type: string): string {
  if (!type) return 'series';
  
  switch (type.toUpperCase()) {
    case 'LIGHT_NOVEL': return 'light-novels';
    case 'COMIC': return 'comics';
    default: return type.toLowerCase();
  }
}

export const TYPE_OPTIONS = CONTENT_TYPES.map(type => ({
  value: type,
  label: getContentTypeLabel(type)
}));
