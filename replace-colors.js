import fs from 'fs';
import path from 'path';

function replaceColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace cyan, blue, emerald with sky
      content = content.replace(/\bcyan-(100|200|300|400|500|600|700|800|900|950|50)\b/g, 'sky-$1');
      content = content.replace(/\bblue-(100|200|300|400|500|600|700|800|900|950|50)\b/g, 'sky-$1');
      content = content.replace(/\bemerald-(100|200|300|400|500|600|700|800|900|950|50)\b/g, 'sky-$1');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

replaceColors('./src');
console.log('Colors replaced!');
