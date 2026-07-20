export const APP_NAME = 'REDBEARD';
export const APP_TAGLINE = 'The Ultimate Reading Experience';
export const APP_DESCRIPTION = 'REDBEARD is a premium manhwa reading platform offering the best reading experience with thousands of manhwa, manga, and webtoon titles.';
export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

export const APP_URL = getBaseUrl();

export const COLORS = {
  primary: '#E53935',
  accent: '#FF6B6B',
  background: '#0F1115',
  surface: '#181B22',
  card: '#20242C',
  border: 'rgba(255,255,255,0.08)',
  text: {
    primary: '#FFFFFF',
    secondary: '#B8B8B8',
    muted: '#8D8D8D',
  },
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
} as const;

export const READER_MODES = [
  { id: 'vertical', label: 'Vertical Scroll', icon: 'ArrowDown' },
  { id: 'horizontal', label: 'Horizontal', icon: 'ArrowRight' },
  { id: 'longStrip', label: 'Long Strip', icon: 'Rows3' },
  { id: 'singlePage', label: 'Single Page', icon: 'Square' },
  { id: 'doublePage', label: 'Double Page', icon: 'Columns2' },
] as const;


export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'views', label: 'Most Views' },
  { value: 'bookmarks', label: 'Most Bookmarked' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'updated', label: 'Recently Updated' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'ONGOING', label: 'Ongoing', color: '#4CAF50' },
  { value: 'COMPLETED', label: 'Completed', color: '#2196F3' },
  { value: 'HIATUS', label: 'Hiatus', color: '#FFC107' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#F44336' },
  { value: 'UPCOMING', label: 'Upcoming', color: '#9C27B0' },
] as const;

export const ACHIEVEMENTS_XP = {
  chapterRead: 10,
  seriesCompleted: 100,
  review: 25,
  comment: 5,
  dailyLogin: 15,
  streakBonus: 50,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Browse', href: '/browse/trending', icon: 'Compass' },
  { label: 'Genres', href: '/browse/genres', icon: 'Grid3x3' },
  { label: 'Latest', href: '/browse/latest', icon: 'Clock' },
  { label: 'Popular', href: '/browse/popular', icon: 'TrendingUp' },
] as const;

export const USER_NAV_ITEMS = [
  { label: 'Profile', href: '/user/profile', icon: 'User' },
  { label: 'Bookmarks', href: '/user/bookmarks', icon: 'Bookmark' },
  { label: 'History', href: '/user/history', icon: 'History' },
  { label: 'Reading Lists', href: '/user/reading-lists', icon: 'List' },
  { label: 'Notifications', href: '/user/notifications', icon: 'Bell' },
  { label: 'Settings', href: '/user/settings', icon: 'Settings' },
] as const;

export const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Browse', href: '/browse/trending', icon: 'Compass' },
  { label: 'Search', href: '/search', icon: 'Search' },
  { label: 'Library', href: '/user/bookmarks', icon: 'BookOpen' },
  { label: 'Profile', href: '/user/profile', icon: 'User' },
] as const;
