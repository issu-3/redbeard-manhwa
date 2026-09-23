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
  
  const publicAndroidShell = resolve(process.cwd(), 'public/android-shell');
  const outDir = resolve(process.cwd(), 'out');

  // Clear public/android-shell
  if (fs.existsSync(publicAndroidShell)) {
    fs.rmSync(publicAndroidShell, { recursive: true, force: true });
  }
  fs.mkdirSync(publicAndroidShell, { recursive: true });

  // Copy all html files (except error pages)
  const files = fs.readdirSync(outDir);
  let indexFound = false;
  for (const file of files) {
    if (file.endsWith('.html') && file !== '404.html' && file !== '500.html' && !file.startsWith('_')) {
      const src = resolve(outDir, file);
      // Make android-app.html the index.html so the app boots into it
      const dest = file === 'android-app.html' 
        ? resolve(publicAndroidShell, 'index.html') 
        : resolve(publicAndroidShell, file);
      fs.copyFileSync(src, dest);
      if (file === 'android-app.html') indexFound = true;
    }
  }
  
  if (!indexFound) {
    console.warn('WARNING: android-app.html not found in out/ directory!');
  }

  // Copy _next for JS/CSS chunks
  if (fs.existsSync(resolve(outDir, '_next'))) {
    fs.cpSync(resolve(outDir, '_next'), resolve(publicAndroidShell, '_next'), { recursive: true });
  }

  // Copy other static assets
  const assetsToCopy = ['images', 'fonts', 'manifest.json', 'logo.png', 'logo.jpg', 'icon.png', 'apple-icon.png', 'favicon.ico', 'placeholder-cover.jpg'];
  for (const asset of assetsToCopy) {
    const src = resolve(outDir, asset);
    const dest = resolve(publicAndroidShell, asset);
    if (fs.existsSync(src)) {
      if (fs.lstatSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
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
