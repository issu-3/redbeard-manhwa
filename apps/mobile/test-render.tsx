import React from 'react';
import { renderToString } from 'react-dom/server';
import { ChapterList } from './src/features/series/ChapterList';

const apiResponse = {
  "id": "cmrxv1eq0000004kye4f9sf4j",
  "title": "I'll Eat Your Mom First",
  "slug": "ill-eat-your-mom-first",
  "coverImage": "https://ihjloxxxffzfctow.public.blob.vercel-storage.com/1784832196957_136656169936778443.webp",
  "type": "PORNHWA",
  "status": "ONGOING",
  "isNSFW": false,
  "averageRating": 4,
  "ratingCount": 1,
  "totalViews": 444,
  "totalBookmarks": 3,
  "chapterCount": 5,
  "genres": [
    { "name": "HAREM", "slug": "harem" },
    { "name": "ADULT ", "slug": "adult" }
  ],
  "updatedAt": "2026-09-20T17:38:52.443Z",
  "alternativeTitles": ["Go Ahead", "Mom / 엄마 먼저 드세요"],
  "description": "Desc",
  "synopsis": "Syn",
  "bannerImage": "Banner",
  "readingDirection": "VERTICAL",
  "releaseYear": 2025,
  "isHot": false,
  "isFeatured": false,
  "isEditorChoice": false,
  "isHiddenGem": false,
  "tags": [],
  "authors": [],
  "artists": [],
  "chapters": [
    {
      "id": "cmst9rn3f000004jixa6eurmc",
      "number": null,
      "label": "CHAPTER 101-121",
      "slug": "chapter-chapter-101-121",
      "totalPages": 0,
      "totalViews": 139,
      "publishedAt": "2026-08-14T18:17:20.431Z",
      "isRead": false,
      "sourceType": "EXTERNAL",
      "downloadUrl": "url",
      "downloadProvider": "TeraBox"
    }
  ],
  "createdAt": "2026-07-23T18:44:10.824Z"
};

try {
  console.log("Rendering ChapterList...");
  const html = renderToString(React.createElement(ChapterList, { chapters: apiResponse.chapters, localChapters: {} }));
  console.log("ChapterList ok!", html.substring(0, 100));
} catch(e) {
  console.error("Crash during ChapterList:", e);
}
