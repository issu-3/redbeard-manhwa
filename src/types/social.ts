export interface CommentData {
  id: string;
  userId: string;
  user: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
  };
  chapterId: string;
  content: string;
  likesCount: number;
  isPinned: boolean;
  isSpoiler: boolean;
  isEdited: boolean;
  isLiked?: boolean;
  replies: CommentReplyData[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReplyData {
  id: string;
  userId: string;
  user: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
  };
  commentId: string;
  parentReplyId?: string;
  content: string;
  likesCount: number;
  isEdited: boolean;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewData {
  id: string;
  userId: string;
  user: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  seriesId: string;
  title: string;
  content: string;
  isSpoiler: boolean;
  likesCount: number;
  isLiked?: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationData {
  id: string;
  type: 'NEW_CHAPTER' | 'REPLY' | 'LIKE' | 'FOLLOW' | 'ACHIEVEMENT' | 'SYSTEM' | 'WARNING';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AchievementData {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  category: 'READING' | 'SOCIAL' | 'COLLECTION' | 'STREAK' | 'SPECIAL';
  xpReward: number;
  isSecret: boolean;
  isUnlocked?: boolean;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    level: number;
  };
  xp: number;
  chaptersRead: number;
  readingStreak: number;
}
