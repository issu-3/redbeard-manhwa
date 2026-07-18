import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/(?=.*[a-z])/, 'Must contain a lowercase letter').regex(/(?=.*[A-Z])/, 'Must contain an uppercase letter').regex(/(?=.*\d)/, 'Must contain a number'),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name must be at most 50 characters').optional(),
});

export const seriesSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  synopsis: z.string().optional(),
  coverImage: z.string().url('Must be a valid URL'),
  bannerImage: z.string().url().optional(),
  type: z.enum(['MANHWA', 'MANGA', 'MANHUA', 'WEBTOON']),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UPCOMING']),
  readingDirection: z.enum(['LTR', 'RTL', 'VERTICAL']).default('VERTICAL'),
  releaseYear: z.number().int().min(1950).max(2030).optional(),
  genreIds: z.array(z.string()).min(1, 'At least one genre is required'),
  tagIds: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  artistIds: z.array(z.string()).optional(),
  alternativeTitles: z.array(z.string()).optional(),
  isNSFW: z.boolean().default(false),
});

export const chapterSchema = z.object({
  number: z.number().positive('Chapter number must be positive'),
  title: z.string().max(200).optional(),
  isPublished: z.boolean().default(false),
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment must be at most 2000 characters'),
  isSpoiler: z.boolean().default(false),
});

export const reviewSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(50, 'Review must be at least 50 characters').max(5000),
  isSpoiler: z.boolean().default(false),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1, 'Rating must be at least 1').max(10, 'Rating must be at most 10'),
});

export const reportSchema = z.object({
  targetType: z.enum(['comment', 'review', 'series', 'user']),
  targetId: z.string(),
  type: z.enum(['SPAM', 'HARASSMENT', 'SPOILER', 'INAPPROPRIATE', 'COPYRIGHT', 'OTHER']),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

export const readingListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UPCOMING']).optional(),
  type: z.enum(['MANHWA', 'MANGA', 'MANHUA', 'WEBTOON']).optional(),
  sort: z.enum(['latest', 'popular', 'rating', 'views', 'bookmarks', 'alphabetical', 'updated']).default('popular'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  year: z.number().int().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  language: z.string().default('en'),
  readerMode: z.enum(['vertical', 'horizontal', 'longStrip', 'singlePage', 'doublePage']).default('vertical'),
  readingDirection: z.enum(['ltr', 'rtl']).default('ltr'),
  autoNextChapter: z.boolean().default(true),
  showReadingProgress: z.boolean().default(true),
  enableNotifications: z.boolean().default(true),
  enableSounds: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  fontSize: z.number().min(12).max(24).default(16),
  brightness: z.number().min(0).max(200).default(100),
  contrast: z.number().min(0).max(200).default(100),
  sepia: z.number().min(0).max(100).default(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SeriesInput = z.infer<typeof seriesSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ReadingListInput = z.infer<typeof readingListSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
