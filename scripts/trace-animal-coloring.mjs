// Convert freshly generated coloring-book line art into standalone, paintable
// SVG paths. The result contains no embedded raster or external dependencies.
// Usage: node scripts/trace-animal-coloring.mjs MANIFEST_JSON [SHARP_MODULE_PATH]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[3] || 'sharp');
const records = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const output = path.resolve('assets/animal-art/coloring');
await fs.mkdir(output, { recursive: true });

// Trace the exposed edges of a binary mask. Opposite-facing edges around
// holes are retained, so even-odd fill reproduces the original closed ink.
function contours(mask, width, height) {
  const stride = width + 1;
  const edges = new Map();
  const add = (x0, y0, x1, y1) => {
    const a = y0 * stride + x0, b = y1 * stride + x1;
    if (!edges.has(a)) edges.set(a, []);
    edges.get(a).push(b);
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (!mask[p]) continue;
    if (!y || !mask[p - width]) add(x, y, x + 1, y);
    if (x === width - 1 || !mask[p + 1]) add(x + 1, y, x + 1, y + 1);
    if (y === height - 1 || !mask[p + width]) add(x + 1, y + 1, x, y + 1);
    if (!x || !mask[p - 1]) add(x, y + 1, x, y);
  }
  const paths = [];
  while (edges.size) {
    const start = edges.keys().next().value;
    let current = start;
    const points = [];
    do {
      points.push([current % stride, Math.floor(current / stride)]);
      const options = edges.get(current);
      if (!options?.length) break;
      const next = options.pop();
      if (!options.length) edges.delete(current);
      current = next;
    } while (current !== start);
    if (points.length < 4) continue;
    // Collinear pixel edges become one segment; rounded rendering smooths
    // the remaining subpixel corners at normal toddler-game sizes.
    const clean = points.filter((p, i) => {
      const a = points[(i + points.length - 1) % points.length];
      const b = points[(i + 1) % points.length];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    if (clean.length >= 3) paths.push(`M${clean.map(p => p.join(' ')).join('L')}Z`);
  }
  return paths.join('');
}

for (const { id, path: source } of records) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`Invalid coloring id: ${id}`);
  const { data, info } = await sharp(source).resize(600, 600, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const count = width * height;
  const ink = new Uint8Array(count);
  for (let i = 0; i < count; i++) ink[i] = (data[i * channels] + data[i * channels + 1] + data[i * channels + 2]) / 3 < 155 ? 1 : 0;
  const labels = new Int32Array(count); labels.fill(-1);
  const queue = new Int32Array(count);
  const regions = [];
  let label = 0;
  for (let p = 0; p < count; p++) {
    if (ink[p] || labels[p] !== -1) continue;
    let head = 0, tail = 1, border = false;
    queue[0] = p; labels[p] = label;
    while (head < tail) {
      const q = queue[head++], x = q % width, y = Math.floor(q / width);
      if (!x || !y || x === width - 1 || y === height - 1) border = true;
      for (const n of [x > 0 ? q - 1 : -1, x + 1 < width ? q + 1 : -1, y > 0 ? q - width : -1, y + 1 < height ? q + width : -1]) {
        if (n >= 0 && !ink[n] && labels[n] === -1) { labels[n] = label; queue[tail++] = n; }
      }
    }
    if (!border && tail >= 500) regions.push({ label, area: tail });
    label++;
  }
  regions.sort((a, b) => b.area - a.area);
  if (regions.length < 4) throw new Error(`${id} has only ${regions.length} enclosed coloring regions; regenerate with closed zones.`);
  const main = regions.slice(0, 8);
  const paths = main.map((region, i) => {
    const mask = new Uint8Array(count);
    for (let p = 0; p < count; p++) if (labels[p] === region.label) mask[p] = 1;
    return `<path data-region="${i === 0 ? 'body' : `part-${i}`}" d="${contours(mask, width, height)}" fill="#ffffff" fill-rule="evenodd"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n` +
    `<title>${id.replaceAll('-', ' ')} coloring picture</title>\n` +
    `<rect width="${width}" height="${height}" fill="#ffffff" pointer-events="none"/>\n` +
    paths.join('\n') + '\n' +
    `<path data-fixed="true" pointer-events="none" d="${contours(ink, width, height)}" fill="#3a3357" fill-rule="evenodd"/>\n</svg>\n`;
  await fs.writeFile(path.join(output, `${id}.svg`), svg);
  console.log(`Traced ${id}: ${main.length} paintable regions`);
}
