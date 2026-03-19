// Generates PWA icons as PNG using sharp (available via Next.js)
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];

function buildSvg(size, maskable = false) {
  const pad = maskable ? size * 0.1 : 0;
  const r = maskable ? 0 : size * 0.15;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const sw = inner * 0.07;

  // Checkmark points (relative to center)
  const x1 = cx - inner * 0.18, y1 = cy + inner * 0.05;
  const x2 = cx - inner * 0.04, y2 = cy + inner * 0.20;
  const x3 = cx + inner * 0.22, y3 = cy - inner * 0.10;

  // "T" font size
  const fs = inner * 0.34;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
  <text x="${cx}" y="${cy - inner * 0.12}" font-family="Arial,sans-serif" font-weight="bold" font-size="${fs}" fill="white" text-anchor="middle" dominant-baseline="central">T</text>
  <polyline points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="#22c55e" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

for (const size of sizes) {
  for (const maskable of [false, true]) {
    const svg = Buffer.from(buildSvg(size, maskable));
    const suffix = maskable ? 'maskable-' : '';
    const filename = `icon-${suffix}${size}x${size}.png`;
    await sharp(svg).png().toFile(join(outDir, filename));
    console.log(`Generated ${filename}`);
  }
}

console.log('Done!');
