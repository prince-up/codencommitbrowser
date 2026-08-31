const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\lucky\\OneDrive\\Pictures\\Desktop\\codencommitbrowser\\anazk';

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.next'].includes(file)) {
          filelist = walkSync(dirFile, filelist);
        }
      } else {
        if (/\.(ts|tsx|js|json|yml|yaml|html|prisma|md)$/.test(file)) {
          filelist.push(dirFile);
        }
      }
    } catch (e) {}
  });
  return filelist;
};

const files = walkSync(rootDir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Scopes and imports
  content = content.replace(/@anazk\//g, '@codenbrowser/');
  
  // Titles and Text
  content = content.replace(/CodenBrowser/g, 'CodenBrowser');
  
  // Variables, URLs, DB names
  content = content.replace(/codenbrowser_prod/g, 'codenbrowser_prod');
  content = content.replace(/codenbrowser-storage/g, 'codenbrowser-storage');
  content = content.replace(/codenbrowser-s3-bucket/g, 'codenbrowser-s3-bucket');
  content = content.replace(/codenbrowser-mock-s3/g, 'codenbrowser-mock-s3');
  
  // Root names
  content = content.replace(/"codenbrowser"/g, '"codenbrowser"');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated: ' + file.replace(rootDir, ''));
  }
});

console.log('SUCCESS: Modified ' + changedFiles + ' files.');
