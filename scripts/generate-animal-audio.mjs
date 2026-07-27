import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const VOICE_NAME = process.env.ELEVENLABS_VOICE_NAME || 'Rachel';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const OUTPUT_DIR = path.resolve('assets/audio/animals');
const ANIMALS_FILE = new URL('./animals.json', import.meta.url);

if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY environment variable.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function articleFor(name) {
  return /^[aeiou]/i.test(name.trim()) ? 'an' : 'a';
}

function speechText(name) {
  return `It's ${articleFor(name)}... ${name.toUpperCase()}!`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getVoiceId() {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error(
        `ElevenLabs rejected ELEVENLABS_API_KEY (401). Create a brand-new key, copy the full key from the creation dialog, and replace the GitHub repository secret. Do not use the key nickname or the final-four-character hint. Response: ${body}`
      );
    }
    throw new Error(`Could not load voices: ${response.status} ${body}`);
  }

  const data = await response.json();
  const voices = Array.isArray(data.voices) ? data.voices : [];
  if (!voices.length) throw new Error('No ElevenLabs voices are available for this account.');

  const preferred = voices.find(
    (voice) => voice.name?.toLowerCase() === VOICE_NAME.toLowerCase()
  );

  const selected = preferred || voices[0];
  console.log(`Using voice: ${selected.name} (${selected.voice_id})`);
  return selected.voice_id;
}

async function generateClip(voiceId, animal, destination) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'content-type': 'application/json',
        accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: speechText(animal),
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0.55,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`${animal}: ${response.status} ${await response.text()}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, audio);
}

async function main() {
  const animals = JSON.parse(await readFile(ANIMALS_FILE, 'utf8'));
  await mkdir(OUTPUT_DIR, { recursive: true });
  const voiceId = await getVoiceId();

  let generated = 0;
  let skipped = 0;
  const failures = [];

  for (const [index, animal] of animals.entries()) {
    const filename = `${slugify(animal)}.mp3`;
    const destination = path.join(OUTPUT_DIR, filename);

    if (await exists(destination)) {
      console.log(`[${index + 1}/${animals.length}] Skipping ${filename}`);
      skipped += 1;
      continue;
    }

    try {
      console.log(`[${index + 1}/${animals.length}] Generating ${filename}: ${speechText(animal)}`);
      await generateClip(voiceId, animal, destination);
      generated += 1;
      await sleep(500);
    } catch (error) {
      console.error(`Failed: ${error.message}`);
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
