import { execSync } from 'child_process';
import { resolve } from 'path';
import fs from 'fs';

let originalTsconfig = '';

console.log('Building Android Shell (Static Export)...');

const apiPath = resolve(process.cwd(), 'src/app/api');
const apiDisabledPath = resolve(process.cwd(), 'src/api_temp_disabled');

const websitePath = resolve(process.cwd(), 'src/app/(website)');
const websiteDisabledPath = resolve(process.cwd(), 'src/website_temp_disabled');

const actionsPath = resolve(process.cwd(), 'src/app/actions');
const actionsDisabledPath = resolve(process.cwd(), 'src/actions_temp_disabled');

const tsconfigPath = resolve(process.cwd(), 'tsconfig.json');

try {
  // Hide API, Website, and Actions routes so static export doesn't fail
  if (fs.existsSync(apiPath)) {
    console.log('Temporarily hiding API routes for static export...');
    fs.renameSync(apiPath, apiDisabledPath);
  }
  if (fs.existsSync(websitePath)) {
    console.log('Temporarily hiding Website routes for static export...');
    fs.renameSync(websitePath, websiteDisabledPath);
  }
  
  if (fs.existsSync(tsconfigPath)) {
    console.log('Mocking Server Actions via tsconfig paths...');
    originalTsconfig = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfigObj = JSON.parse(originalTsconfig);
    if (!tsconfigObj.compilerOptions) tsconfigObj.compilerOptions = {};
    if (!tsconfigObj.compilerOptions.paths) tsconfigObj.compilerOptions.paths = {};
    tsconfigObj.compilerOptions.paths['@/app/actions/*'] = ["./src/mock-actions/*"];
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigObj, null, 2));
  }

  const publicAndroidShell = resolve(process.cwd(), 'public/android-shell');
  const outDir = resolve(process.cwd(), 'out');

  // Clear public/android-shell BEFORE build to prevent recursive inclusion in out/
  if (fs.existsSync(publicAndroidShell)) {
    console.log('Clearing old public/android-shell to prevent recursive bundle bloat...');
    fs.rmSync(publicAndroidShell, { recursive: true, force: true });
  }
  
  if (fs.existsSync(outDir)) {
    console.log('Clearing old out/ directory...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // We run Next.js build with NEXT_PUBLIC_CAPACITOR=true
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_CAPACITOR: 'true',
    }
  });
  
  console.log('Android Shell build complete.');
  console.log('Isolating Android bundle for Capacitor...');
  
  fs.mkdirSync(publicAndroidShell, { recursive: true });

  // Copy all contents from out/ to public/android-shell/
  fs.cpSync(outDir, publicAndroidShell, { recursive: true });

  // Make android-app/index.html the root index.html so the app boots into it
  const androidAppIndex = resolve(publicAndroidShell, 'android-app/index.html');
  if (fs.existsSync(androidAppIndex)) {
    fs.copyFileSync(androidAppIndex, resolve(publicAndroidShell, 'index.html'));
  } else {
    console.warn('WARNING: android-app/index.html not found in out/ directory!');
  }

  console.log('Syncing Capacitor...');
  
  execSync('npx cap sync android', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_CAPACITOR: 'true',
    }
  });

  console.log('Capacitor sync complete. Open Android Studio or use CLI to assemble APK.');
} catch (e) {
  console.error('Build failed', e);
  process.exit(1);
} finally {
  // Always restore hidden routes
  if (fs.existsSync(apiDisabledPath)) {
    console.log('Restoring API routes...');
    fs.renameSync(apiDisabledPath, apiPath);
  }
  if (fs.existsSync(websiteDisabledPath)) {
    console.log('Restoring Website routes...');
    fs.renameSync(websiteDisabledPath, websitePath);
  }
  if (originalTsconfig) {
    console.log('Restoring tsconfig.json...');
    fs.writeFileSync(tsconfigPath, originalTsconfig);
  }
}
