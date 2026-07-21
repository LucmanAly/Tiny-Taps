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

// Computer speech during gameplay is restricted to exactly three triggers:
// Counting taps, Big/Small round start, and Trace It completion.
const voiceGames = new Set(['js/games/counting.js', 'js/games/bigsmall.js', 'js/games/trace.js']);
for (const file of files.filter(f => f.includes(`${path.sep}games${path.sep}`))) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('speakWord(') && !voiceGames.has(rel)) {
    errors.push(`${rel} uses the restricted computer-speech channel`);
  }
}

for (const rel of voiceGames) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const calls = [...source.matchAll(/\.speakWord\(/g)].length;
  if (calls !== 1) errors.push(`${rel} must contain exactly one computer-speech trigger (found ${calls})`);
}
const exactVoiceCalls = new Map([
  ['js/games/counting.js', 'speech.speakWord(WORDS[counted])'],
  ['js/games/bigsmall.js', "ctx.speech.speakWord(target.size === 'big' ? 'Big' : 'Small')"],
  ['js/games/trace.js', 'speech.speakWord(current.spoken'],
]);
for (const [rel, expected] of exactVoiceCalls) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!source.includes(expected)) errors.push(`${rel} does not use its required single-name voice value`);
}

const [{ ANIMALS }, { TRACE_ANIMALS }, { nextPathPoint }] = await Promise.all([
  import('../js/data/animals.js'),
  import('../js/data/trace-items.js'),
  import('../js/games/trace.js'),
]);
if (TRACE_ANIMALS.length !== ANIMALS.length) errors.push('Trace animal catalog does not cover every animal');
const traceSignatures = new Set();
for (const item of TRACE_ANIMALS) {
  if (!item.paths?.length) errors.push(`Trace animal ${item.id} has no outline`);
  traceSignatures.add((item.paths || []).join('|'));
}
if (traceSignatures.size !== TRACE_ANIMALS.length) errors.push('Trace animals must have distinct outlines');

// A stationary contact cannot advance, a closed path cannot jump from its
// overlapping start to its endpoint, and sampled movement along a line does
// reach the end reliably.
const closed = { pts: Array.from({ length: 101 }, (_, i) => ({
  x: i === 100 ? 0 : i, y: 0, len: i,
})) };
if (nextPathPoint(closed, 0, { x: 0, y: 0 }, 0) !== 0) errors.push('Trace advances without movement');
if (nextPathPoint(closed, 0, { x: 0, y: 0 }, 6) >= 100) errors.push('Trace can jump across a closed path');
const line = { pts: Array.from({ length: 101 }, (_, i) => ({ x: i, y: 0, len: i })) };
let linePoint = 0;
for (let x = 6; x <= 102; x += 6) linePoint = nextPathPoint(line, linePoint, { x: Math.min(x, 100), y: 0 }, 6);
if (linePoint !== 100) errors.push('Trace does not follow valid sampled movement to completion');

const puzzleSource = fs.readFileSync(path.join(root, 'js/games/puzzle.js'), 'utf8');
if (puzzleSource.includes('Complete the pattern') || puzzleSource.includes('spatial-board')) {
  errors.push('Puzzle Fit Shapes mode still contains pattern-sequence logic');
}
if (!puzzleSource.includes('fit-gap-target') || !puzzleSource.includes('PICTURE_PUZZLES')) {
  errors.push('Puzzle Fit Shapes mode is missing negative-space picture fitting');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Tiny Taps check passed: ${files.filter(f => f.endsWith('.js')).length} modules and all offline assets verified.`);
