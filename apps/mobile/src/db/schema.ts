export const DB_NAME = 'redbeard_offline_db';

export const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    cover TEXT,
    synopsis TEXT,
    author TEXT,
    artist TEXT,
    status TEXT,
    type TEXT,
    genres TEXT,
    bookmarked INTEGER DEFAULT 0,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chapter (
    id TEXT PRIMARY KEY,
    seriesId TEXT NOT NULL,
    title TEXT,
    chapterNumber REAL,
    slug TEXT,
    totalPages INTEGER,
    publishedAt TEXT,
    downloadStatus TEXT,
    localFilePath TEXT,
    read INTEGER DEFAULT 0,
    readingProgress INTEGER DEFAULT 0,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY(seriesId) REFERENCES series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS download (
    id TEXT PRIMARY KEY,
    chapterId TEXT NOT NULL,
    status TEXT,
    localPath TEXT,
    fileSize INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY(chapterId) REFERENCES chapter(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    id TEXT PRIMARY KEY,
    seriesId TEXT NOT NULL,
    chapterId TEXT NOT NULL,
    currentPage INTEGER DEFAULT 0,
    percentage REAL DEFAULT 0,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY(seriesId) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY(chapterId) REFERENCES chapter(id) ON DELETE CASCADE
  );
`;
