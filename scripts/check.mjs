import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(path.join(root, 'js'));

for (const file of files.filter(f => f.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), match[1]);
    if (!fs.existsSync(target)) errors.push(`${path.relative(root, file)} imports missing ${match[1]}`);
  }
}

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assetBlock = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetBlock) errors.push('Could not find service-worker ASSETS list');
else {
  for (const match of assetBlock[1].matchAll(/['"]([^'"]+)['"]/g)) {
    const asset = match[1];
    if (asset === '.') continue;
    if (!fs.existsSync(path.join(root, asset))) errors.push(`Service worker references missing ${asset}`);
  }
}

const animals = fs.readFileSync(path.join(root, 'js/data/animals.js'), 'utf8');
for (const match of animals.matchAll(/(?:art|sound):\s*['"]([^'"]+)['"]/g)) {
  if (!fs.existsSync(path.join(root, match[1]))) errors.push(`Animal data references missing ${match[1]}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons || []) {
  if (!fs.existsSync(path.join(root, icon.src))) errors.push(`Manifest references missing ${icon.src}`);
}

// Computer speech during gameplay is restricted to Counting and Trace It.
for (const file of files.filter(f => f.includes(`${path.sep}games${path.sep}`))) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('speakWord(') && !['js/games/counting.js', 'js/games/trace.js'].includes(rel)) {
    errors.push(`${rel} uses the restricted computer-speech channel`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Tiny Taps check passed: ${files.filter(f => f.endsWith('.js')).length} modules and all offline assets verified.`);
