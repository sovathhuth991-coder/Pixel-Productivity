// Build valid PWA PNG icons from the SVG artwork (dev-only; not bundled by Vite).
// Run: node scripts/build-icons.cjs
// Replaces two earlier hand-rolled generators that wrote *uncompressed* IDAT
// chunks + bad CRCs — invalid PNGs that iOS/Safari reject and fall back to the
// letter "P" Home-Screen icon. sharp renders the real SVG to spec-compliant
// 8-bit RGBA PNGs (zlib-compressed IDAT, valid IHDR/CRC).
const sharp = require('sharp');
const path = require('path');

const ICONS = path.join(process.cwd(), 'public', 'icons');
const SRC = path.join(ICONS, 'icon-192.svg');

// 192 + 512 for the web manifest; 180 is the iOS Apple-touch-icon size.
const sizes = [
  { name: 'icon-192.png', w: 192, h: 192 },
  { name: 'icon-512.png', w: 512, h: 512 },
  { name: 'apple-touch-icon.png', w: 180, h: 180 },
];

(async () => {
  for (const { name, w, h } of sizes) {
    await sharp(SRC).resize(w, h).png({ compressionLevel: 9 }).toFile(path.join(ICONS, name));
    const b = await sharp(path.join(ICONS, name)).metadata();
    console.log(`wrote ${name} ${b.width}x${b.height} channel=${b.channels} depth=${b.depth}`);
  }
})();
