import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  BIG_NUMBER_SEQUENCE,
  COUNTING_NUMBERS,
  numberWords,
} from '../js/games/numberbook.js';

const VOICE = process.env.PIPER_VOICE || 'en_US-amy-medium';
const PIPER_DATA_DIR = path.resolve(process.env.PIPER_DATA_DIR || '.cache/piper');
const OUTPUT_DIR = path.resolve('assets/audio/numbers');
const REGENERATE = process.env.REGENERATE_AUDIO === '1';
const VALUES = [...new Set([...COUNTING_NUMBERS, ...BIG_NUMBER_SEQUENCE])];

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
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} failed with exit code ${result.status}${details ? `:\n${details}` : ''}`);
  }
}

async function generateClip(value, wavPath, mp3Path) {
  const phrase = numberWords(value).replaceAll('-', ' ');
  run('python3', [
    '-m', 'piper',
    '-m', VOICE,
    '--data-dir', PIPER_DATA_DIR,
    '-f', wavPath,
    '--', phrase,
  ]);
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', wavPath,
    '-codec:a', 'libmp3lame',
    '-b:a', '96k',
    mp3Path,
  ]);
  await rm(wavPath, { force: true });
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(PIPER_DATA_DIR, { recursive: true });

  console.log(`Using local Piper voice: ${VOICE}`);
  console.log(`Preparing ${VALUES.length} Number Book clips with no paid API.`);
  console.log(REGENERATE ? 'Existing number clips will be replaced.' : 'Existing number clips will be skipped.');

  let generated = 0;
  let skipped = 0;
  const failures = [];

  for (const [index, value] of VALUES.entries()) {
    const mp3Path = path.join(OUTPUT_DIR, `${value}.mp3`);
    const wavPath = path.join(OUTPUT_DIR, `${value}.tmp.wav`);
    if (!REGENERATE && await exists(mp3Path)) {
      console.log(`[${index + 1}/${VALUES.length}] Skipping ${value}.mp3`);
      skipped += 1;
      continue;
    }
    try {
      console.log(`[${index + 1}/${VALUES.length}] Generating ${value}.mp3: ${numberWords(value)}`);
      await generateClip(value, wavPath, mp3Path);
      generated += 1;
    } catch (error) {
      await rm(wavPath, { force: true });
      await rm(mp3Path, { force: true });
      console.error(`Failed: ${value}: ${error.message}`);
      failures.push({ value, error: error.message });
    }
  }

  console.log(`Finished. Generated: ${generated}, skipped: ${skipped}, failed: ${failures.length}.`);
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
