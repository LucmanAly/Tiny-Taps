import { access, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const VOICE = process.env.PIPER_VOICE || 'en_US-amy-medium';
const PIPER_DATA_DIR = path.resolve(process.env.PIPER_DATA_DIR || '.cache/piper');
const OUTPUT_DIR = path.resolve('assets/audio/animals');
const ANIMALS_FILE = new URL('./animals.json', import.meta.url);
const REGENERATE = process.env.REGENERATE_AUDIO === '1';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function speechText(name) {
  return name;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} failed with exit code ${result.status}${details ? `:\n${details}` : ''}`);
  }
}

async function generateClip(animal, wavPath, mp3Path) {
  run('python3', [
    '-m',
    'piper',
    '-m',
    VOICE,
    '--data-dir',
    PIPER_DATA_DIR,
    '-f',
    wavPath,
    '--',
    speechText(animal)
  ]);

  run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    wavPath,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    mp3Path
  ]);

  await rm(wavPath, { force: true });
}

async function main() {
  const animals = JSON.parse(await readFile(ANIMALS_FILE, 'utf8'));
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(PIPER_DATA_DIR, { recursive: true });

  console.log(`Using local Piper voice: ${VOICE}`);
  console.log('No API key or paid service is required.');
  console.log(REGENERATE ? 'Existing animal clips will be replaced.' : 'Existing animal clips will be skipped.');

  let generated = 0;
  let skipped = 0;
  const failures = [];

  for (const [index, animal] of animals.entries()) {
    const slug = slugify(animal);
    const mp3Path = path.join(OUTPUT_DIR, `${slug}.mp3`);
    const wavPath = path.join(OUTPUT_DIR, `${slug}.tmp.wav`);

    if (!REGENERATE && await exists(mp3Path)) {
      console.log(`[${index + 1}/${animals.length}] Skipping ${slug}.mp3`);
      skipped += 1;
      continue;
    }

    try {
      console.log(`[${index + 1}/${animals.length}] Generating ${slug}.mp3: ${speechText(animal)}`);
      await generateClip(animal, wavPath, mp3Path);
      generated += 1;
    } catch (error) {
      await rm(wavPath, { force: true });
      await rm(mp3Path, { force: true });
      console.error(`Failed: ${animal}: ${error.message}`);
      failures.push({ animal, error: error.message });
    }
  }

  console.log(`Finished. Generated: ${generated}, skipped: ${skipped}, failed: ${failures.length}.`);

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});