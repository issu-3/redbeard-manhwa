export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  xp: number;
  level: number;
  readingStreak: number;
  isVerified: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface UserStats {
  totalChaptersRead: number;
  totalSeriesBookmarked: number;
  totalReadingTime: number; // in seconds
  totalComments: number;
  totalReviews: number;
  achievementsUnlocked: number;
  followers: number;
  following: number;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  readerMode: 'vertical' | 'horizontal' | 'longStrip' | 'singlePage' | 'doublePage';
  readingDirection: 'ltr' | 'rtl';
  autoNextChapter: boolean;
  showReadingProgress: boolean;
  enableNotifications: boolean;
  enableSounds: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}
