const fs = require('fs');

const content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

// A crude way to extract the object keys for each language.
// Since it's a large file, this might be tricky with regex.
// Let's use a simpler approach: load it via requiring if possible, 
// but it's a TS file.
// A better way is to read the file, split by language sections.

const ptMatch = content.match(/pt: ?\{([\s\S]*?)\n[ ]*\},/);
const enMatch = content.match(/en: ?\{([\s\S]*?)\n[ ]*\},/);
const esMatch = content.match(/es: ?\{([\s\S]*?)\n[ ]*\},/); // Assuming es is at the end?

function getKeys(section) {
  const lines = section.split('\n');
  const keys = [];
  lines.forEach(line => {
    const match = line.match(/"([^"]+)":/);
    if (match) {
      keys.push(match[1]);
    }
  });
  return new Set(keys);
}

const ptKeys = getKeys(ptMatch[1]);
const enKeys = getKeys(enMatch[1]);
const esKeys = esMatch ? getKeys(esMatch[1]) : new Set();

console.log('--- Missing in EN ---');
ptKeys.forEach(key => {
  if (!enKeys.has(key)) console.log(key);
});

console.log('\n--- Missing in ES ---');
ptKeys.forEach(key => {
  if (!esKeys.has(key)) console.log(key);
});
