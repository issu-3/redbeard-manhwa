const fs = require('fs');
const path = require('path');
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  if (content.includes('window.location.href = `/android-reader/?')) {
    content = content.replace(/window\.location\.href = `\/android-reader\/\?/g, 'window.location.href = `/android-reader/index.html?');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}
const dir = path.join(__dirname, 'src/components');
function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  });
}
walk(dir);
