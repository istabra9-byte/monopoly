/* Generate PWA PNG icons from icon.svg */
import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icon.svg');

await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('icons generated');
