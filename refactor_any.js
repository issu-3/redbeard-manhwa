const fs = require('fs');
const glob = require('glob');

// This script will find occurrences of "any" and try to replace them with basic interfaces where possible.

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Revert previous tests
  content = content.replace(/: any \/\* FIXME \*\//g, ': any');

  // We will replace specific known patterns
  // HomepageManager.tsx
  if (filePath.includes('HomepageManager.tsx')) {
    content = content.replace(/export function HomepageManager\({(.*?)}: any\)/g, "export function HomepageManager({$1}: {initialBanners: any[], initialSections: any[], initialManualData: Record<string, any[]>, featuredCount: number, initialSettings: any})");
    content = content.replace(/const handleReorderBanners = \(newItems: any\[\]\)/g, "const handleReorderBanners = (newItems: unknown[])");
    content = content.replace(/const handleBannerSave = \(e: any\)/g, "const handleBannerSave = (e: React.FormEvent<HTMLFormElement>)");
    content = content.replace(/const handleReorderSections = \(newItems: any\[\]\)/g, "const handleReorderSections = (newItems: unknown[])");
    content = content.replace(/const handleSectionUpdate = \(id: string, updates: any\)/g, "const handleSectionUpdate = (id: string, updates: Record<string, unknown>)");
    content = content.replace(/const handleSettingsSave = \(e: any\)/g, "const handleSettingsSave = (e: React.FormEvent<HTMLFormElement>)");
    content = content.replace(/const handleSearch = async \(e: any\)/g, "const handleSearch = async (e: React.FormEvent<HTMLFormElement>)");
    content = content.replace(/const handleAddManual = \(sectionType: string, series: any\)/g, "const handleAddManual = (sectionType: string, series: Record<string, unknown> | any)");
    content = content.replace(/const handleReorderManual = \(sectionType: string, newItems: any\[\]\)/g, "const handleReorderManual = (sectionType: string, newItems: unknown[])");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${filePath}`);
  }
}

const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(refactorFile);
