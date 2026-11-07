'use client';

import { useEffect } from 'react';

/**
 * ChapterSSRTakeover — client half of the chapter SSR layer.
 *
 * The chapter page server-renders <ChapterSSRContent id="rb-chapter-ssr">
 * so the initial HTML contains the real chapter (heading, images, prev/next
 * links) for crawlers and no-JS readers. The interactive `ChapterReader`
 * renders an empty shell until it mounts; once hydration has run (two
 * animation frames, i.e. the reader's own mount effect has fired and its
 * first real frame is committed), this component hides the SSR block and
 * the reader — same layout, same images, already cache-warm — takes over.
 *
 * If hydration never happens (JS disabled, bundle error), the effect never
 * runs and the SSR content stays visible and fully readable.
 */
export function ChapterSSRTakeover() {
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        document
          .getElementById('rb-chapter-ssr')
          ?.style.setProperty('display', 'none');
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  return null;
}
