const fs = require('fs-extra');
const path = require('path');

const projectPath = path.join(__dirname, '..');
const srcPath = path.join(projectPath, 'src');
const distPath = path.join(projectPath, 'dist');

if (fs.existsSync(distPath)) {
  fs.emptyDirSync(distPath);
}

fs.copySync(
  path.join(srcPath, 'css'),
  path.join(distPath, 'css')
);

fs.copySync(
  path.join(srcPath, 'font'),
  path.join(distPath, 'font')
);
