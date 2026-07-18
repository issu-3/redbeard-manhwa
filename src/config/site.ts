import { APP_URL, APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

export const siteConfig = {
  name: APP_NAME,
  tagline: 'The Ultimate Reading Experience',
  description: APP_DESCRIPTION,
  url: APP_URL,
  ogImage: '/images/og-default.png',
  links: {
    twitter: 'https://twitter.com/redbeard',
    discord: 'https://discord.gg/redbeard',
    github: 'https://github.com/redbeard',
  },
  creator: 'REDBEARD Team',
  keywords: [
    'manhwa',
    'manga',
    'manhua',
    'webtoon',
    'read manhwa',
    'read manga',
    'korean comics',
    'webcomic reader',
    'manga reader',
    'free manhwa',
    'online reader',
  ],
} as const;
