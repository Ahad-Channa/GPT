const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes(".replace('/api', '')")) {
        content = content.replace(/\.replace\('\/api', ''\)/g, ".replace(/\\/api\\/?$/, '')");
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed Socket URL in: ${fullPath}`);
      }
    }
  }
}

processDir('./frontend/src');
console.log('Done fixing socket URLs.');
