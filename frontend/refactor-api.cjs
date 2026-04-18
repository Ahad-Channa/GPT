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
      
      let modified = false;

      // 1. Standardize constant API variable definitions
      if (content.includes("VITE_API_URL || 'http://localhost:5000';")) {
        content = content.replace(/VITE_API_URL \|\| 'http:\/\/localhost:5000';/g, "VITE_API_URL || 'http://localhost:5000/api';");
        modified = true;
      }

      // 2. Standardize inline fetch calls expecting VITE_API_URL without /api
      // Change: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/
      // To: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/
      if (content.includes("VITE_API_URL || 'http://localhost:5000'}/api/")) {
        content = content.replace(/VITE_API_URL \|\| 'http:\/\/localhost:5000'}\/api\//g, "VITE_API_URL || 'http://localhost:5000/api'}/");
        modified = true;
      }
      
      // 3. Remove redundant /api/ from constant variable usages
      // Change: `${API}/api/
      // To: `${API}/
      if (content.includes("${API}/api/")) {
        content = content.replace(/\$\{API\}\/api\//g, "${API}/");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Cleaned up API prefix logic: ${fullPath}`);
      }
    }
  }
}

processDir('./src');
console.log('Finished standardizing VITE_API_URL to include /api');
