// Normalize generated cutouts for the offline game. No runtime dependency.
// Usage: node scripts/prepare-animal-art.mjs MANIFEST_JSON [SHARP_MODULE_PATH]
// The manifest is an array of { id, path } referring to generated source PNGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.argv[3] || 'sharp');
const manifest = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const output = path.resolve('assets/animal-art');
await fs.mkdir(output, { recursive: true });

for (const { id, path: source } of manifest) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`Invalid animal id: ${id}`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Image generation can leave tiny disconnected specks outside a cutout.
  // Keep substantial connected parts (including separate wings/feet), and
  // discard those specks before framing. Never add an opaque backdrop.
  const { width, height, channels } = info;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const minimum = Math.max(12, Math.floor(width * height * 0.00012));
  let left = width, top = height, right = -1, bottom = -1;
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || data[p * channels + 3] < 24) continue;
    let head = 0, tail = 1;
    queue[0] = p; seen[p] = 1;
    while (head < tail) {
      const q = queue[head++];
      const x = q % width, y = Math.floor(q / width);
      for (const n of [x > 0 ? q - 1 : -1, x + 1 < width ? q + 1 : -1, y > 0 ? q - width : -1, y + 1 < height ? q + width : -1]) {
        if (n >= 0 && !seen[n] && data[n * channels + 3] >= 24) {
          seen[n] = 1; queue[tail++] = n;
        }
      }
    }
    if (tail < minimum) {
      for (let i = 0; i < tail; i++) data[queue[i] * channels + 3] = 0;
    } else {
      for (let i = 0; i < tail; i++) {
        const x = queue[i] % width, y = Math.floor(queue[i] / width);
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) throw new Error(`Empty animal artwork: ${id}`);
  for (let p = 0; p < seen.length; p++) if (data[p * channels + 3] < 24) data[p * channels + 3] = 0;
  const cutout = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(688, 688, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const size = await sharp(cutout).metadata();
  await sharp({ create: { width: 768, height: 768, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cutout, left: Math.round((768 - size.width) / 2), top: Math.round((768 - size.height) / 2) }])
    .webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(path.join(output, `${id}.webp`));
  console.log(`Prepared ${id}`);
}
