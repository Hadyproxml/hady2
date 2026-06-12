
const fs = require('fs');
const content = fs.readFileSync('/src/App.tsx', 'utf8');
const startLine = 3137;
const endLine = 3671;
const lines = content.split('\n').slice(startLine - 1, endLine);
const text = lines.join('\n');

let braces = 0;
let parens = 0;
let tags = [];

for (let i = 0; i < text.length; i++) {
  if (text[i] === '{') braces++;
  if (text[i] === '}') braces--;
  if (text[i] === '(') parens++;
  if (text[i] === ')') parens--;
}

console.log(`Braces: ${braces}`);
console.log(`Parens: ${parens}`);
