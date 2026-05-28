import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(dir, 'logo.svg');

const outputs = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-48.png', size: 48 },
  { name: 'icon-128.png', size: 128 },
  { name: 'toolbar-16.png', size: 16 },
  { name: 'toolbar-24.png', size: 24 },
  { name: 'toolbar-32.png', size: 32 },
];

await Promise.all(
  outputs.map(({ name, size }) =>
    sharp(src, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(dir, name))
  )
);

console.log(`Rasterized ${outputs.length} PNGs from logo.svg`);
