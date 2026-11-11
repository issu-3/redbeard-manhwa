import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { ChapterSSRContent } from '@/components/reader/ChapterSSRContent';
import { ChapterSSRTakeover } from '@/components/reader/ChapterSSRTakeover';
import type { ChapterData } from '@/types';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { resolveSocialImages } from '@/lib/seo';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDirectCdnUrl } from '@/lib/s3';
import { resolveReaderChapterId } from '@/lib/chapter-lookup';

// ISR: this page renders identically for every visitor, so it is cached
// and revalidated hourly instead of being rendered per request. That is
// only possible because nothing user-specific happens here anymore —
// comment likes, reader preferences and view tracking are hydrated
// client-side (see src/app/actions/reader.ts, ChapterReader and
// CommentSection). Do not call auth(), headers() or cookies() in this
// file: any of them opts the page back into per-request rendering.
export const revalidate = 3600;

// ─── Data Fetching ───────────────────────────────────────────────

const getCachedChapterDataInternal = unstable_cache(
  async (slug: string, chapterSlug: string): Promise<ChapterData | null> => {
    const series = await prisma.series.findUnique({
      where: { slug },
      select: { id: true, title: true, slug: true },
    });

    if (!series) return null;

    const chapterId = await resolveReaderChapterId(series.id, chapterSlug);
    if (!chapterId) return null;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        images: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!chapter) return null;

    // Find adjacent chapters concurrently
    let prevChapter = null;
    let nextChapter = null;
    if (chapter.number !== null) {
      [prevChapter, nextChapter] = await Promise.all([
        prisma.chapter.findFirst({
          where: {
            seriesId: series.id,
            number: { lt: chapter.number },
            isPublished: true,
          },
          orderBy: { number: 'desc' },
          select: { number: true, slug: true },
        }),
        prisma.chapter.findFirst({
          where: {
            seriesId: series.id,
            number: { gt: chapter.number },
            isPublished: true,
          },
          orderBy: { number: 'asc' },
          select: { number: true, slug: true },
        })
      ]);
    }

    return {
      id: chapter.id,
      seriesId: series.id,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      number: chapter.number,
      label: chapter.label || undefined,
      title: chapter.title || undefined,
      slug: chapter.slug,
      totalPages: chapter.totalPages || chapter.images.length,
      sourceType: chapter.sourceType || 'UPLOAD',
      downloadUrl: chapter.downloadUrl || undefined,
      downloadProvider: chapter.downloadProvider || undefined,
      images: chapter.images?.map((img: any) => {
        const directUrl = getDirectCdnUrl(img.imageUrl);
        let defaultUrl = `/api/chapter/${chapter.id}/page/${img.pageNumber - 1}`;
        if (process.env.NEXT_PUBLIC_IMAGE_WORKER_URL) {
          defaultUrl = `${process.env.NEXT_PUBLIC_IMAGE_WORKER_URL}${defaultUrl}`;
        }
        return {
          id: img.id,
          pageNumber: img.pageNumber,
          imageUrl: directUrl || defaultUrl,
          width: img.width || undefined,
          height: img.height || undefined,
          blurHash: img.blurHash || undefined,
        };
      }) || [],
      prevChapter: prevChapter ? { number: prevChapter.number, slug: prevChapter.slug } : undefined,
      nextChapter: nextChapter ? { number: nextChapter.number, slug: nextChapter.slug } : undefined,
      seo: chapter.seo as Record<string, string> | undefined,
    };
  },
  ['chapter-reader-data'],
  { tags: ['chapter-data'], revalidate: 3600 }
);

const getChapterData = cache(async (slug: string, chapterSlug: string): Promise<ChapterData | null> => {
  return getCachedChapterDataInternal(slug, chapterSlug);
});

// OPT-05: Cache comments to avoid hitting DB on every chapter page load
const getCachedChapterComments = unstable_cache(
  async (chapterId: string) => {
    return prisma.comment.findMany({
      where: { chapterId },
      include: {
        user: {
          select: { displayName: true, username: true, avatarUrl: true, role: true }
        },
        replies: {
          include: {
            user: {
              select: { displayName: true, username: true, avatarUrl: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },
  ['chapter-comments'],
  { tags: ['comments', 'chapter-comments'], revalidate: 3600 }
);

// ─── Metadata ──────────────────────────────────────────────────

function parseRobotsDirectives(seo: Record<string, any>) {
  let shouldIndex = true;
  let shouldFollow = true;

  if (typeof seo.robots === 'string') {
    const tokens = seo.robots
      .toLowerCase()
      .split(/[\s,]+/)
      .map((t: string) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      if (token === 'noindex') {
        shouldIndex = false;
      } else if (token === 'index') {
        shouldIndex = true;
      } else if (token === 'nofollow') {
        shouldFollow = false;
      } else if (token === 'follow') {
        shouldFollow = true;
      } else if (token === 'none') {
        shouldIndex = false;
        shouldFollow = false;
      } else if (token === 'all') {
        shouldIndex = true;
        shouldFollow = true;
      }
    }
  } else if (seo.robots && typeof seo.robots === 'object') {
    if (typeof seo.robots.index === 'boolean') {
      shouldIndex = seo.robots.index;
    }
    if (typeof seo.robots.follow === 'boolean') {
      shouldFollow = seo.robots.follow;
    }
  }

  // Explicit admin override properties (noindex / nofollow) take precedence
  if (seo.noindex === true || seo.noindex === 'true' || seo.noindex === 1 || seo.noindex === '1') {
    shouldIndex = false;
  } else if (seo.noindex === false || seo.noindex === 'false' || seo.noindex === 0 || seo.noindex === '0') {
    shouldIndex = true;
  }

  if (seo.nofollow === true || seo.nofollow === 'true' || seo.nofollow === 1 || seo.nofollow === '1') {
    shouldFollow = false;
  } else if (seo.nofollow === false || seo.nofollow === 'false' || seo.nofollow === 0 || seo.nofollow === '0') {
    shouldFollow = true;
  }

  return {
    index: shouldIndex,
    follow: shouldFollow,
    'max-image-preview': 'large' as const,
    'max-snippet': -1,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}): Promise<Metadata> {
  const { slug, chapterSlug } = await params;

  const chapter = await getChapterData(slug, chapterSlug);
  const settings = await getCachedSettings();

  if (!chapter) notFound();

  const seo = (chapter.seo || {}) as Record<string, any>;
  const _siteTitle = settings.seo_site_title || 'REDBEARD';

  const defaultTitle = `${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`}${chapter.title ? ` - ${chapter.title}` : ''} — Read Online | ${settings.siteName || 'REDBEARD'}`;
  const defaultDesc = `Read ${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`}${chapter.title ? ` - ${chapter.title}` : ''} online on ${settings.siteName || 'REDBEARD'}. High quality reading experience.`;
  const safeSlug = typeof chapter.slug === 'string' && chapter.slug.trim() ? chapter.slug : chapter.number != null ? String(chapter.number) : null;

  if (!safeSlug) notFound();

  const defaultUrl = `${APP_URL}/series/${slug}/chapter/${safeSlug}`;
  const defaultImage = chapter.images.length > 0 ? chapter.images[0].imageUrl : undefined;

  // Stored SEO text generated at import time can contain the raw chapter
  // slug (e.g. "chapter-chapter-41-60") for grouped chapters; never surface
  // that to users or search engines — fall back to the composed default.
  const title = seo.title && !seo.title.includes(chapter.slug) ? seo.title : defaultTitle;
  const description = seo.description && !seo.description.includes(chapter.slug) ? seo.description : defaultDesc;
  const rawCanonical = seo.canonicalUrl || seo.canonical || defaultUrl;
  const canonical = rawCanonical
    .replace(/^http:\/\//, 'https://')
    .replace('https://www.redbeard.store', 'https://redbeard.store')
    .replace('https://redbeard-manhwa.vercel.app', 'https://redbeard.store')
    .replace(/\/+$/, '');
  const { ogImage, twitterImage } = resolveSocialImages({
    customOgImage: seo.ogImage || defaultImage,
    customTwitterImage: seo.twitterImage,
    settings,
  });
  const keywords = typeof seo.keywords === 'string' ? seo.keywords.split(',').map((k: string) => k.trim()) : undefined;

  return {
    title: { absolute: title },
    description,
    keywords,
    robots: parseRobotsDirectives(seo),
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      url: canonical,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twitterImage],
    },
    alternates: {
      canonical: canonical,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;

  const chapter = await getChapterData(slug, chapterSlug);
  if (!chapter) {
    notFound();
  }

  const safeSlug = typeof chapter.slug === 'string' && chapter.slug.trim() ? chapter.slug : chapter.number != null ? String(chapter.number) : null;
  if (!safeSlug) {
    notFound();
  }

  if (safeSlug !== chapterSlug) {
    redirect(`/series/${slug}/chapter/${safeSlug}`);
  }

  // Handle external redirect
  if (chapter.sourceType === 'DOWNLOAD' && chapter.downloadUrl) {
    // Views of these chapters are counted client-side (the reader posts
    // to /api/tracking/view on mount) and in the download route. This
    // render used to also write view rows server-side, which forced the
    // page to stay dynamic — and double-counted chapters that render in
    // the reader, since the client tracks them too.

    // Ensure the external URL is absolute to prevent relative redirect bugs
    let targetUrl = chapter.downloadUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const isCbzUrl = targetUrl.toLowerCase().endsWith('.cbz') || targetUrl.includes('drive.google.com');
    if (isCbzUrl) {
      try {
        const { resolverManager } = await import('@/lib/providers/factory');
        const resolver = resolverManager.getResolver(targetUrl);
        if (!resolver) throw new Error('No resolver');

        const resolved = await resolver.resolve(targetUrl);
        if (!resolved.success || !resolved.downloadUrl) throw new Error('Failed to resolve URL');

        const resolvedHeaders = (resolved as any).headers || {};
        const { getRemoteFileSize, getRemoteCbzMetadata } = await import('@/lib/cbz-remote');
        const fileSize = await getRemoteFileSize(resolved.downloadUrl, resolvedHeaders);
        const metadata = await getRemoteCbzMetadata(resolved.downloadUrl, resolvedHeaders, fileSize);

        const workerUrl = process.env.NEXT_PUBLIC_IMAGE_WORKER_URL || '';
        chapter.images = metadata.pages.map((p: any) => ({
          id: `cbz-page-${p.index}`,
          pageNumber: p.index + 1,
          imageUrl: `${workerUrl}/api/chapter/${chapter.id}/page/${p.index}`,
          width: 800,
          height: 1200
        })) as any;
        // Skip redirect, let it render ChapterReader below
      } catch (err) {
        console.error('Failed to parse remote CBZ for website reader:', err);
        redirect(targetUrl); // Fallback to redirect if parsing fails
      }
    } else {
      // Redirect to the external URL
      redirect(targetUrl);
    }
  }

  // Reading history and view tracking is now handled asynchronously via client-side API call
  // to prevent blocking the server render thread (TTFB optimization).

  // OPT-05: Use cached comments query. Per-user like state is NOT merged
  // here anymore — CommentSection hydrates it client-side for the
  // signed-in user (getChapterLikeState), and reader preferences are
  // fetched client-side too (getMyReaderPreferences). That keeps this
  // render identical for everyone, which is what makes it cacheable.
  const comments = await getCachedChapterComments(chapter.id);

  const settings = await getCachedSettings();

  const siteUrl = APP_URL || 'http://localhost:3000';
  const chapterUrl = `${siteUrl}/series/${slug}/chapter/${safeSlug}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: chapter.seriesTitle,
        item: `${siteUrl}/series/${slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: chapter.label || `Chapter ${chapter.number}`,
        item: chapterUrl,
      }
    ]
  };

  const chapterLd = {
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: chapter.title || chapter.label || `Chapter ${chapter.number}`,
    isPartOf: {
      '@type': 'ComicSeries',
      name: chapter.seriesTitle,
      url: `${siteUrl}/series/${slug}`
    },
    url: chapterUrl,
    image: chapter.images.length > 0 ? chapter.images[0].imageUrl : undefined
  };

  const adsterraBannerScript = settings.ads_enabled_adsterra === 'true' && settings.ads_adsterra_banner 
    ? Buffer.from(settings.ads_adsterra_banner).toString('base64') 
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(chapterLd) }}
      />
      {/* SEO: Server-rendered crawlable link back to parent series for Googlebot */}
      <Link href={`/series/${slug}`} className="sr-only">
        Back to {chapter.seriesTitle}
      </Link>
      {/* SEO SSR: the real chapter content (heading, page images, breadcrumb
          and prev/next anchors) in the initial HTML. ChapterReader renders
          an empty shell until it mounts client-side, so without this block
          crawlers only ever saw a "Loading..." page. The reader hides this
          block on mount via ChapterSSRTakeover and takes over unchanged. */}
      <ChapterSSRContent chapter={chapter} />
      <ChapterSSRTakeover />
      <ChapterReader
        chapter={chapter}
        comments={comments}
        defaultReadingMode={'longStrip'}
        youtubeUrl={settings.youtubeUrl || null}
        adsterraBannerScript={adsterraBannerScript}
      />
    </>
  );
}
