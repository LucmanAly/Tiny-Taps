import { readFile, mkdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;

if (!apiKey || !voiceId) {
  console.error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID.');
  process.exit(1);
}

const animals = JSON.parse(
  await readFile(new URL('./animals.json', import.meta.url), 'utf8')
);

const outputDir = path.resolve('assets/audio/animals');
await mkdir(outputDir, { recursive: true });

function filenameFor(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') + '.mp3';
}

function phraseFor(name) {
  const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
  return `It's ${article}... ${name.toUpperCase()}!`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

for (const [index, animal] of animals.entries()) {
  const filename = filenameFor(animal);
  const destination = path.join(outputDir, filename);

  if (await exists(destination)) {
    console.log(`[${index + 1}/${animals.length}] Skipping ${filename}`);
    continue;
  }

  console.log(`[${index + 1}/${animals.length}] Generating ${filename}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: phraseFor(animal),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`ElevenLabs failed for ${animal}: ${response.status} ${details}`);
  }

  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  await new Promise(resolve => setTimeout(resolve, 350));
}

console.log(`Finished. Audio files are in ${outputDir}`);
