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
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const versionSource = fs.readFileSync(path.join(root, 'js/data/version.js'), 'utf8');
const releaseVersion = (versionSource.match(/VERSION = '([^']+)'/) || [])[1];
if (!releaseVersion) errors.push('Could not read displayed release version');
else {
  for (const asset of ['css/main.css', 'css/games.css', 'js/app.js']) {
    if (!indexHtml.includes(`${asset}?v=${releaseVersion}`)) {
      errors.push(`index.html does not use the ${releaseVersion} cache key for ${asset}`);
    }
  }
  if (!sw.includes(`tiny-taps-v${releaseVersion}`)) {
    errors.push(`Service-worker cache does not match displayed version ${releaseVersion}`);
  }
}
const assetBlock = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetBlock) errors.push('Could not find service-worker ASSETS list');
else {
  // Strip `//` line comments before pairing quotes — an apostrophe or a
  // quoted phrase inside a comment (e.g. "the baby's four poses") would
  // otherwise be read as a string-literal delimiter and desync every
  // quote pairing after it.
  const withoutComments = assetBlock[1].replace(/\/\/[^\n]*/g, '');
  for (const match of withoutComments.matchAll(/['"]([^'"]+)['"]/g)) {
    const asset = match[1];
    if (asset === '.') continue;
    if (!fs.existsSync(path.join(root, asset))) errors.push(`Service worker references missing ${asset}`);
  }
}

const daddySharkAsset = 'assets/art/daddy-shark-coloring.svg';
const motuColoringAsset = 'assets/art/motu-coloring.svg';
const johnColoringAsset = 'assets/art/john-the-don-coloring.svg';
const patluColoringAsset = 'assets/art/patlu-coloring.svg';
const uploadedColoringAssets = [
  'assets/art/family-man-coloring.svg',
  'assets/art/family-woman-coloring.svg',
  'assets/art/family-baby-camera-coloring.svg',
  'assets/art/family-boy-coloring.svg',
  'assets/art/chingam-coloring.svg',
];
const externalColoringAssets = [
  daddySharkAsset,
  motuColoringAsset,
  johnColoringAsset,
  patluColoringAsset,
  ...uploadedColoringAssets,
];
for (const required of externalColoringAssets) {
  if (!sw.includes(`'${required}'`)) errors.push(`Service worker does not cache ${required}`);
}

const coloringSource = fs.readFileSync(path.join(root, 'js/games/coloring.js'), 'utf8');
for (const required of externalColoringAssets) {
  if (!coloringSource.includes(`src: '${required}'`)) {
    errors.push(`Coloring game does not include ${required} as a page`);
  }
}

const daddySharkSvg = fs.readFileSync(path.join(root, daddySharkAsset), 'utf8');
const daddySharkRegions = [...daddySharkSvg.matchAll(/data-region="([^"]+)"/g)].map(match => match[1]);
const expectedDaddySharkRegions = [
  'head', 'muzzle', 'belly', 'right-fin-tail', 'mouth', 'left-fin', 'dorsal-fin',
];
if (daddySharkRegions.join(',') !== expectedDaddySharkRegions.join(',')) {
  errors.push('Daddy Shark SVG must expose exactly the seven expected coloring regions');
}
if (daddySharkSvg.includes('<image') || daddySharkSvg.includes('preserveAspectRatio="none"')) {
  errors.push('Daddy Shark SVG must remain editable vector art without distortion');
}
if (!daddySharkSvg.includes('data-fixed="true" pointer-events="none"')) {
  errors.push('Daddy Shark fixed face, tooth, and outline details must pass taps through');
}

const motuColoringSvg = fs.readFileSync(path.join(root, motuColoringAsset), 'utf8');
const motuRegions = [...motuColoringSvg.matchAll(/data-region="([^"]+)"/g)].map(match => match[1]);
const expectedMotuRegions = ['pants', 'shirt-body', 'skin', 'shirt-sleeves', 'shirt-sleeves', 'vest', 'vest', 'pants', 'skin', 'shoes', 'skin', 'shoes', 'collar'];
if (motuRegions.join(',') !== expectedMotuRegions.join(',')) {
  errors.push('Character SVG must expose the expected grouped coloring regions');
}
if (motuColoringSvg.includes('<image') || motuColoringSvg.includes('preserveAspectRatio="none"')) {
  errors.push('Character SVG must remain editable vector art without distortion');
}
if (!motuColoringSvg.includes('data-fixed="true" pointer-events="none"')) {
  errors.push('Character fixed outlines and facial details must pass taps through');
}

const additionalColoringRegions = new Map([
  [johnColoringAsset, ['shirt-body', 'pants', 'skin', 'sleeves', 'shoes', 'shoes', 'skin', 'sleeves', 'sleeves', 'trim', 'sleeves', 'skin', 'trim', 'skin', 'skin', 'trim', 'skin', 'trim', 'sleeves']],
  [patluColoringAsset, ['face', 'outfit', 'face', 'pants', 'pants', 'shoes', 'shoes', 'glasses-lenses', 'glasses-lenses', 'collar']],
]);
for (const [asset, expectedRegions] of additionalColoringRegions) {
  const svg = fs.readFileSync(path.join(root, asset), 'utf8');
  const regions = [...svg.matchAll(/data-region="([^"]+)"/g)].map(match => match[1]);
  if (regions.join(',') !== expectedRegions.join(',')) {
    errors.push(`${asset} must expose the expected grouped coloring regions`);
  }
  if (svg.includes('<image') || svg.includes('preserveAspectRatio="none"')) {
    errors.push(`${asset} must remain editable vector art without distortion`);
  }
  if (!svg.includes('data-fixed="true" pointer-events="none"')) {
    errors.push(`${asset} fixed outlines and facial details must pass taps through`);
  }
}

const uploadedColoringGroups = new Map([
  ['assets/art/family-man-coloring.svg', ['skin', 'shirt', 'pants', 'shoes', 'hair']],
  ['assets/art/family-woman-coloring.svg', ['skin', 'blouse', 'pants', 'hair']],
  ['assets/art/family-baby-camera-coloring.svg', ['skin', 'shirt', 'camera', 'camera-lens']],
  ['assets/art/family-boy-coloring.svg', ['skin', 'shirt', 'hair']],
  ['assets/art/chingam-coloring.svg', ['skin', 'uniform-shirt', 'uniform-pants', 'cap', 'belt', 'shoes']],
]);
for (const [asset, requiredGroups] of uploadedColoringGroups) {
  const svg = fs.readFileSync(path.join(root, asset), 'utf8');
  const groups = [...svg.matchAll(/data-region="([^"]+)"/g)].map(match => match[1]);
  for (const group of requiredGroups) {
    if (!groups.includes(group)) errors.push(`${asset} is missing grouped ${group} coloring paths`);
  }
  if (groups.length < requiredGroups.length * 2) {
    errors.push(`${asset} does not join enough split paths into logical coloring regions`);
  }
  if (svg.includes('<image') || svg.includes('preserveAspectRatio="none"')) {
    errors.push(`${asset} must remain editable vector art without distortion`);
  }
  if (!svg.includes('data-fixed="true" pointer-events="none"')) {
    errors.push(`${asset} fixed outlines and facial details must pass taps through`);
  }
}
for (const color of ['#8B5CF6', '#17B7D6', '#8B5A2B', '#D8A17D']) {
  if (!coloringSource.includes(color)) errors.push(`Coloring palette is missing ${color}`);
}
if (!coloringSource.includes("id: 'characters'") || !coloringSource.includes("id: 'all'")) {
  errors.push('Coloring game must expose All Pictures and Characters filters');
}

const animals = fs.readFileSync(path.join(root, 'js/data/animals.js'), 'utf8');
for (const match of animals.matchAll(/(?:art|sound):\s*['"]([^'"]+)['"]/g)) {
  if (!fs.existsSync(path.join(root, match[1]))) errors.push(`Animal data references missing ${match[1]}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons || []) {
  if (!fs.existsSync(path.join(root, icon.src))) errors.push(`Manifest references missing ${icon.src}`);
}
const pwaIcons = new Map([
  ['icons/tiny-taps-touch-180.png', 180],
  ['icons/tiny-taps-touch-192.png', 192],
  ['icons/tiny-taps-touch-512.png', 512],
]);
function pngDimensions(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 1, 4) !== 'PNG') return null;
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}
for (const [asset, size] of pwaIcons) {
  const full = path.join(root, asset);
  if (!fs.existsSync(full)) {
    errors.push(`Tiny Taps icon set is missing ${asset}`);
    continue;
  }
  const dimensions = pngDimensions(full);
  if (!dimensions || dimensions[0] !== size || dimensions[1] !== size) {
    errors.push(`${asset} must be exactly ${size}x${size}`);
  }
  if (!sw.includes(`'${asset}'`)) errors.push(`Service worker does not cache ${asset}`);
}
if (!indexHtml.includes('icons/tiny-taps-touch-180.png')
    || !indexHtml.includes('icons/tiny-taps-touch-192.png')) {
  errors.push('HTML must use the new Tiny Taps touch icon for Apple and browser icons');
}
const manifestIconSources = (manifest.icons || []).map(icon => icon.src);
if (manifestIconSources.join(',') !==
    'icons/tiny-taps-touch-192.png,icons/tiny-taps-touch-512.png') {
  errors.push('PWA manifest must use the new Tiny Taps touch icon set');
}

// Computer speech during gameplay is restricted to four game modules:
// Counting taps, Big/Small round start, Trace It completion, and Play House
// interaction cues. Number Book and My First Words use bundled Piper audio.
const voiceGames = new Set([
  'js/games/counting.js',
  'js/games/bigsmall.js',
  'js/games/trace.js',
  'js/games/playhouse.js',
]);
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
  ['js/games/playhouse.js', 'speech.speakWord(word'],
]);
for (const [rel, expected] of exactVoiceCalls) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!source.includes(expected)) errors.push(`${rel} does not use its required single-name voice value`);
}

const [
  { ANIMALS },
  { TRACE_ANIMALS },
  { nextPathPoint },
  { FIRST_WORD_CATEGORIES },
  {
    COUNTING_NUMBERS,
    BIG_NUMBER_SEQUENCE,
    numberWords,
    formatNumber,
    numberSize,
    numberVoicePath,
    DEFAULT_PAGE_DELAY,
    normalizePageDelay,
    pageDelayLabel,
  },
] = await Promise.all([
  import('../js/data/animals.js'),
  import('../js/data/trace-items.js'),
  import('../js/games/trace.js'),
  import('../js/games/animals.js'),
  import('../js/games/numberbook.js'),
]);
if (COUNTING_NUMBERS.length !== 101 || COUNTING_NUMBERS.some((value, index) => value !== index)) {
  errors.push('Number Book counting mode must contain every whole number from 0 through 100');
}
const expectedBigNumbers = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000,
  1_000_000_000, 10_000_000_000, 100_000_000_000, 1_000_000_000_000,
];
if (BIG_NUMBER_SEQUENCE.join(',') !== expectedBigNumbers.join(',')) {
  errors.push('Number Book big-number mode must contain tens and place values through one trillion');
}
const spokenNumberChecks = new Map([
  [0, 'zero'],
  [42, 'forty-two'],
  [100, 'one hundred'],
  [1_000, 'one thousand'],
  [100_000, 'one hundred thousand'],
  [1_000_000_000_000, 'one trillion'],
]);
for (const [value, expected] of spokenNumberChecks) {
  if (numberWords(value) !== expected) errors.push(`Number Book says ${value} incorrectly`);
}
if (formatNumber(1_000_000_000_000) !== '1,000,000,000,000') {
  errors.push('Number Book must group large display numbers with commas');
}
const numberSizeChecks = new Map([
  [100, 'large'],
  [1_000, 'compact'],
  [10_000, 'small'],
  [1_000_000, 'smaller'],
  [100_000_000, 'tiny'],
  [1_000_000_000_000, 'smallest'],
]);
for (const [value, expected] of numberSizeChecks) {
  if (numberSize(value) !== expected) errors.push(`Number Book sizes ${value} incorrectly`);
}
if (!fs.readFileSync(path.join(root, 'js/games/numberbook.js'), 'utf8').includes("title: '10s & Big Numbers'")) {
  errors.push('Number Book must use the complete 10s & Big Numbers mode name');
}
const numberbookSource = fs.readFileSync(path.join(root, 'js/games/numberbook.js'), 'utf8');
if (numberbookSource.includes('.speakWord(') || !numberbookSource.includes('audio.play(numberVoiceKey(value)')) {
  errors.push('Number Book must play bundled Piper clips instead of browser speech');
}
if (DEFAULT_PAGE_DELAY !== 0.25
    || normalizePageDelay(null) !== DEFAULT_PAGE_DELAY
    || normalizePageDelay(-1) !== 0
    || normalizePageDelay(0.37) !== 0.25
    || normalizePageDelay(5) !== 2
    || pageDelayLabel(0) !== 'Instant'
    || pageDelayLabel(1) !== '1 second') {
  errors.push('Number Book page delay must support remembered quarter-second choices from Instant to 2 seconds');
}
if (!numberbookSource.includes('PAGE_DELAY_STORAGE_KEY')
    || !numberbookSource.includes('cancelPendingTurn(true)')
    || !numberbookSource.includes('render();\n    });')) {
  errors.push('Number Book must remember page timing and switch modes without a delayed page turn');
}
const expectedNumberAudioValues = [...new Set([...COUNTING_NUMBERS, ...BIG_NUMBER_SEQUENCE])];
if (expectedNumberAudioValues.length !== 111) {
  errors.push('Number Book must have exactly 111 unique spoken values');
}
for (const value of expectedNumberAudioValues) {
  const asset = numberVoicePath(value);
  if (!fs.existsSync(path.join(root, asset))) errors.push(`Number Book is missing Piper clip ${asset}`);
}
if (!sw.includes('...NUMBER_AUDIO_ASSETS')) {
  errors.push('Service worker must include the complete generated Number Book audio collection');
}
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

const firstWordCategoryNames = Object.keys(FIRST_WORD_CATEGORIES);
if (firstWordCategoryNames.join(',') !== 'animals,shark-family,objects') {
  errors.push('My First Words categories must be Animals, Shark Family, and Objects');
}
const animalWordIds = FIRST_WORD_CATEGORIES.animals.map(item => item.id);
const sharkFamilyIds = FIRST_WORD_CATEGORIES['shark-family'].map(item => item.id);
const objectWordIds = FIRST_WORD_CATEGORIES.objects.map(item => item.id);
if (!animalWordIds.includes('shark')) errors.push('Generic shark is missing from the Animals deck');
if (sharkFamilyIds.includes('shark') || sharkFamilyIds.length !== 5) {
  errors.push('Shark Family must contain only the five colored family sharks');
}
const allFirstWordIds = [...animalWordIds, ...sharkFamilyIds, ...objectWordIds];
if (allFirstWordIds.length !== 73 || new Set(allFirstWordIds).size !== allFirstWordIds.length) {
  errors.push('My First Words categories must partition all 73 cards exactly once');
}

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
