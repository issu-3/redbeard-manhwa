import fs from 'fs-extra';
import { execSync } from 'child_process';
import path from 'path';

// Define paths
const srcAppDir = path.join(process.cwd(), 'src', 'app');
const srcAppBackupDir = path.join(process.cwd(), 'src', 'app-backup');
const outDir = path.join(process.cwd(), 'out');
const androidShellDir = path.join(process.cwd(), 'public', 'android-shell');

console.log('--- Starting Android Shell Build ---');

try {
  // 1. Rename src/app to src/app-backup
  console.log('1. Backing up src/app...');
  if (fs.existsSync(srcAppBackupDir)) {
    fs.removeSync(srcAppBackupDir);
  }
  fs.renameSync(srcAppDir, srcAppBackupDir);

  // 2. Create minimal src/app for local shell
  console.log('2. Creating minimal src/app...');
  fs.mkdirSync(srcAppDir);

  // 2a. Root layout (with MobileNav)
  fs.writeFileSync(
    path.join(srcAppDir, 'layout.tsx'),
    `import '@/app-backup/globals.css';
import { MobileNav } from '@/components/layout/MobileNav';

export const metadata = { title: 'REDBEARD Offline' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-inter text-text-primary antialiased">
        <main id="main-content" className="flex-1 flex flex-col">{children}</main>
        <MobileNav />
        <div className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:hidden shrink-0" />
      </body>
    </html>
  );
}`
  );

  // 2b. Root page (Browse - redirect to online if available, else show error)
  fs.writeFileSync(
    path.join(srcAppDir, 'page.tsx'),
    `'use client';
import { useEffect, useState } from 'react';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BrowseFallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking connection...');
  
  useEffect(() => {
    let isMounted = true;
    
    // Auto-redirect to library initially on boot!
    // Since Capacitor boots into index.html (/), we should immediately redirect to /library
    // UNLESS the user explicitly navigated here. But in SPA, boot is always index.html.
    // Let's do a quick reachability check.
    
    async function checkReachability() {
      try {
        if (!Capacitor.isNativePlatform()) return;
        const response = await CapacitorHttp.get({
          url: 'https://redbeard.store/api/search',
          connectTimeout: 3000,
          readTimeout: 3000,
        });
        if (isMounted) {
          if (response.status >= 200 && response.status < 400 && response.data?.success) {
            setStatus('Online. Connecting...');
            window.location.replace('https://redbeard.store');
            return;
          } else {
            throw new Error('Offline');
          }
        }
      } catch (err) {
        if (isMounted) {
          // If booting offline, go straight to library!
          window.location.replace('/library.html');
        }
      }
    }

    checkReachability();

    return () => { isMounted = false; };
  }, [router]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-text-secondary">
      <Compass className="h-16 w-16 mb-4 opacity-50" />
      <p className="text-lg font-bold">{status}</p>
    </div>
  );
}`
  );

  // Helper to generate a generic offline fallback page
  const generateFallback = (iconName, title, message) => {
    return `'use client';
import { ${iconName} } from 'lucide-react';
export default function Fallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-text-secondary">
      <${iconName} className="h-16 w-16 mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-text-primary mb-2">${title}</h2>
      <p>${message}</p>
    </div>
  );
}`;
  };

  // 2c. Create fallback pages for Updates, History, More
  fs.mkdirSync(path.join(srcAppDir, 'browse', 'latest'), { recursive: true });
  fs.writeFileSync(path.join(srcAppDir, 'browse', 'latest', 'page.tsx'), generateFallback('Bell', 'Updates Unavailable', 'Connect to the internet to see new chapters.'));

  fs.mkdirSync(path.join(srcAppDir, 'user', 'history'), { recursive: true });
  fs.writeFileSync(path.join(srcAppDir, 'user', 'history', 'page.tsx'), generateFallback('History', 'History Unavailable', 'Local history is coming soon.'));

  fs.mkdirSync(path.join(srcAppDir, 'more'), { recursive: true });
  fs.writeFileSync(path.join(srcAppDir, 'more', 'page.tsx'), generateFallback('Settings', 'Settings', 'More options and settings will appear here.'));

  // 2d. Copy the Offline Library page
  console.log('3. Copying required routes and actions...');
  fs.mkdirSync(path.join(srcAppDir, 'library'), { recursive: true });
  fs.copySync(
    path.join(srcAppBackupDir, '(main)', 'library'),
    path.join(srcAppDir, 'library')
  );
  
  // Mock actions to satisfy imports without triggering Server Action static export errors
  console.log('3. Mocking required actions...');
  fs.mkdirSync(path.join(srcAppDir, 'actions'), { recursive: true });
  
  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'comments.ts'),
    `export const likeComment = async () => {};
export const replyToComment = async () => {};
export const postComment = async () => {};`
  );

  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'preferences.ts'),
    `export const saveUserPreferences = async () => {};`
  );
  
  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'bookmarks.ts'),
    `export const toggleBookmark = async () => {};`
  );
  
  fs.mkdirSync(path.join(srcAppDir, 'actions', 'public'), { recursive: true });
  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'public', 'chapters.ts'),
    `export const getSeriesChapters = async () => { return []; };`
  );
  
  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'public', 'reviews.ts'),
    `export const submitReview = async () => {};
export const deleteReview = async () => {};`
  );
  
  fs.writeFileSync(
    path.join(srcAppDir, 'actions', 'public', 'settings.ts'),
    `export const getCachedSettings = async () => { return null; };`
  );

  // 3. Build Next.js with output: export
  console.log('4. Building Next.js static export...');
  // Force NEXT_PUBLIC_CAPACITOR to skip some checks if they exist, and set APP_URL
  const env = { 
    ...process.env, 
    NEXT_PUBLIC_CAPACITOR: 'true',
    NEXT_PUBLIC_APP_URL: 'https://redbeard.store'
  };

  // We need to inject output: 'export' dynamically into next.config.ts?
  // Next.js App Router allows static export if we just add it to config, but we can't easily modify next.config.ts programmatically without breaking it.
  // Actually, we CAN modify next.config.ts to conditionally output export! Let's do that via env var.
  
  // Delete .next to avoid stale typescript route definition errors
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    fs.removeSync(nextDir);
  }

  execSync('npx next build', { stdio: 'inherit', env });

  // 4. Move output to public/android-shell
  console.log('5. Moving output to public/android-shell...');
  if (fs.existsSync(androidShellDir)) {
    fs.removeSync(androidShellDir);
  }
  fs.copySync(outDir, androidShellDir);
  fs.removeSync(outDir);

  console.log('--- Android Shell Build Complete! ---');

} catch (err) {
  console.error('Build failed!', err);
} finally {
  // 5. Restore src/app
  console.log('6. Restoring src/app...');
  if (fs.existsSync(srcAppBackupDir)) {
    if (fs.existsSync(srcAppDir)) {
      fs.removeSync(srcAppDir);
    }
    fs.renameSync(srcAppBackupDir, srcAppDir);
  }
}
