
const fs = require('fs');

const filePath = './src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace emerald (green) with sky (sky blue)
content = content.replace(/emerald/g, 'sky');
content = content.replace(/Emerald/g, 'Sky'); // Just in case

fs.writeFileSync(filePath, content, 'utf8');
console.log('Colors updated successfully.');
