const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const INDEXED_FILE = path.join(__dirname, 'indexed-urls.json');

function loadIndexedUrls() {
  if (!fs.existsSync(INDEXED_FILE)) {
    return new Set();
  }
  try {
    const raw = fs.readFileSync(INDEXED_FILE, 'utf8');
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.warn('Could not read indexed-urls.json, starting with empty set:', e.message);
    return new Set();
  }
}

function saveIndexedUrls(urlSet) {
  fs.writeFileSync(INDEXED_FILE, JSON.stringify([...urlSet], null, 2), 'utf8');
}

async function fetchLocs(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  }
  const xml = await res.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
}

async function getPrioritizedSitemapUrls() {
  console.log('Fetching main sitemap: https://redbeard.store/sitemap.xml');
  const topLocs = await fetchLocs('https://redbeard.store/sitemap.xml');

  // Prioritize sub-sitemaps: static.xml -> series.xml -> chapters.xml -> others
  const priorityOrder = ['static.xml', 'series.xml', 'chapters.xml'];
  const sortedSubSitemaps = [...topLocs].sort((a, b) => {
    const idxA = priorityOrder.findIndex((p) => a.includes(p));
    const idxB = priorityOrder.findIndex((p) => b.includes(p));
    const orderA = idxA === -1 ? 999 : idxA;
    const orderB = idxB === -1 ? 999 : idxB;
    return orderA - orderB;
  });

  const allUrls = [];
  for (const sitemapUrl of sortedSubSitemaps) {
    if (sitemapUrl.endsWith('.xml')) {
      console.log(`Fetching child sitemap: ${sitemapUrl}`);
      const locs = await fetchLocs(sitemapUrl);
      allUrls.push(...locs.filter((u) => !u.endsWith('.xml')));
    } else {
      allUrls.push(sitemapUrl);
    }
  }

  // Deduplicate while preserving priority order
  return [...new Set(allUrls)];
}

function getServiceAccountCredentials() {
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT);
  }
  if (process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT);
  }

  const devVarsPath = path.join(__dirname, 'apps', 'image-worker', '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const devVarsContent = fs.readFileSync(devVarsPath, 'utf8');
    const startIdx = devVarsContent.indexOf('GOOGLE_DRIVE_SERVICE_ACCOUNT');
    if (startIdx !== -1) {
      const jsonStart = devVarsContent.indexOf('{', startIdx);
      const nextVarMatch = devVarsContent.slice(jsonStart).search(/\n[A-Z0-9_]+=/);
      const jsonEnd =
        nextVarMatch !== -1
          ? jsonStart + devVarsContent.slice(jsonStart, jsonStart + nextVarMatch).lastIndexOf('}')
          : devVarsContent.lastIndexOf('}');
      const jsonString = devVarsContent.slice(jsonStart, jsonEnd + 1).trim();
      return JSON.parse(jsonString);
    }
  }

  throw new Error('Google service account credentials not found in env or apps/image-worker/.dev.vars');
}

async function main() {
  const credentials = getServiceAccountCredentials();
  console.log('Using Service Account:', credentials.client_email);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  const indexing = google.indexing({
    version: 'v3',
    auth,
  });

  const indexedSet = loadIndexedUrls();
  console.log(`Currently tracked indexed URLs: ${indexedSet.size}`);

  const allUrls = await getPrioritizedSitemapUrls();
  console.log(`Total URLs found across sitemaps: ${allUrls.length}`);

  const unindexedUrls = allUrls.filter((u) => !indexedSet.has(u));
  console.log(`Remaining unindexed URLs: ${unindexedUrls.length}`);

  if (unindexedUrls.length === 0) {
    console.log('All sitemap URLs have already been indexed! Nothing to do.');
    return;
  }

  const isDryRun = process.argv.includes('--dry-run');
  const batchLimit = 200;
  const urlsToSubmit = unindexedUrls.slice(0, batchLimit);
  const total = urlsToSubmit.length;

  if (isDryRun) {
    console.log(`[DRY RUN] Would submit ${total} URLs. Next 5 preview:`);
    console.log(urlsToSubmit.slice(0, 5));
    return;
  }

  console.log(`Submitting next batch of ${total} URLs to Google Indexing API (1s delay)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < total; i++) {
    const url = urlsToSubmit[i];
    const indexNum = i + 1;

    try {
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type: 'URL_UPDATED',
        },
      });

      if (response.status === 200) {
        successCount++;
        indexedSet.add(url);
        saveIndexedUrls(indexedSet);
        console.log(`[${indexNum}/${total}] 200 OK - ${url}`);
      } else {
        console.log(`[${indexNum}/${total}] Status ${response.status} - ${url}`);
      }
    } catch (err) {
      failCount++;
      const statusCode = err.response?.status || err.code || 'ERR';
      const msg = err.response?.data?.error?.message || err.message;
      console.error(`[${indexNum}/${total}] FAILED (${statusCode}) - ${url}: ${msg}`);

      if (statusCode === 429) {
        console.error('Daily quota limit reached (429). Halting.');
        break;
      }
    }

    if (i < total - 1) {
      await sleep(1000);
    }
  }

  console.log(`\nBatch summary: ${successCount} succeeded, ${failCount} failed.`);
  console.log(`Total indexed URLs tracked in ${INDEXED_FILE}: ${indexedSet.size}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
