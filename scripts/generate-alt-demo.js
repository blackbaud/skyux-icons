const fs = require('fs-extra');
const path = require('path');

const projectPath = path.join(__dirname, '..');

function generateAltDemo() {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Alt demo</title>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="../src/css/skyux-icons.css">
  <style type="text/css">
    th, td {
      text-align: left;
      padding: 5px;
    }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>
          SKY UX name
        </th>
        <th>
          Font Awesome name
        </th>
        <th>
          SKY UX icon
        </th>
        <th>
          Font Awesome icon
        </th>
      </tr>
    </thead>
    <tbody>
  `;

  const metadata = fs.readJsonSync(path.join(projectPath, 'metadata.json'));

  for (const glyph of metadata.glyphs) {
    html += `
    <tr>
      <td><code>${glyph.name}</code></td>
      <td>${
        glyph.faName ? '<code>' + glyph.faName + '</code>' : '<i>N/A</i>'
      }</td>
      <td><i class="sky-i-${glyph.name}"></i></td>
      <td>${
        glyph.faName
          ? '<i class="fa fa-' + glyph.faName + '"></i>'
          : '<i>N/A</i>'
      }</td>
`;
    html += '</tr>';
  }

  html += `
    </tbody>
  </table>
</body>
</html>
`;

  const altDemoDir = path.join(projectPath, 'alt-demo');

  fs.ensureDirSync(altDemoDir);
  fs.writeFileSync(path.join(altDemoDir, 'index.html'), html);

  console.log('File /alt-demo/index.html created successfully.');
}

generateAltDemo();
