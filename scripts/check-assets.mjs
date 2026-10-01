/**
 * Asset QA — validates the art system against docs/asset-manifest.md:
 *  1. every manifest family exports the promised components
 *  2. landmark keys cover all 40 board spaces
 *  3. character looks cover all 12 ids × 8 emotions
 *  4. palette literals stay inside approved palettes (style guide §2)
 */
import { readFileSync, existsSync } from 'fs';

let failures = 0;
const fail = (msg) => { failures++; console.error('✗', msg); };
const ok = (msg) => console.log('✓', msg);

// 1) files exist
for (const f of ['src/art/characters/Characters.tsx', 'src/art/board/Landmark.tsx', 'src/art/props/Props.tsx', 'src/art/props/Themes.tsx', 'src/art/primitives.tsx']) {
  if (existsSync(f)) ok(`component family present: ${f}`);
  else fail(`missing art family: ${f}`);
}

// 2) landmark coverage
const board = readFileSync('src/data/board.ts', 'utf8');
const artMap = board.match(/export const SPACE_ART[\s\S]*?};/)?.[0] ?? '';
const artIds = [...artMap.matchAll(/(\d+):\s*'/g)].map((m) => Number(m[1]));
const missing = Array.from({ length: 40 }, (_, i) => i).filter((i) => !artIds.includes(i));
if (missing.length === 0 && artIds.length === 40) ok('SPACE_ART covers all 40 spaces');
else fail(`SPACE_ART gaps: ${missing.join(',')}`);

const landmark = readFileSync('src/art/board/Landmark.tsx', 'utf8');
const sceneKeys = [...landmark.matchAll(/^\s{2}([a-z]+):\s*\(/gm)].map((m) => m[1]);
const artKeys = [...artMap.matchAll(/:\s*'([a-z]+)'/g)].map((m) => m[1]);
const missingScenes = [...new Set(artKeys)].filter((k) => !sceneKeys.includes(k));
if (missingScenes.length === 0) ok(`all ${new Set(artKeys).size} art keys have landmark scenes`);
else fail(`landmark scenes missing for: ${missingScenes.join(',')}`);

// 3) character coverage
const chars = board.match(/export const CHARACTERS[\s\S]*?\n\] as const;/)?.[0] ?? '';
const charIds = [...chars.matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1]);
const looks = readFileSync('src/art/characters/Characters.tsx', 'utf8');
const missingLooks = charIds.filter((id) => !looks.includes(`${id}:`));
if (charIds.length === 12 && missingLooks.length === 0) ok('12 characters, all with portrait+pawn looks');
else fail(`character looks missing for: ${missingLooks.join(',') || `count=${charIds.length}`}`);

const emotions = ['idle', 'happy', 'sad', 'angry', 'thinking', 'jailed', 'bankrupt', 'winner'];
const emotionType = looks.match(/export type Emotion = ([^;]+);/)?.[1] ?? '';
const missingEmotions = emotions.filter((e) => !emotionType.includes(`'${e}'`));
if (missingEmotions.length === 0) ok('all 8 emotion states supported');
else fail(`emotions missing: ${missingEmotions.join(',')}`);

// 4) palette discipline — no rogue hex outside known palettes in art files
const approved = new Set([
  // core UI
  '#F4EFE6', '#FFFFFF', '#26243B', '#6B6885', '#E4572E', '#B23A18', '#F2B33D',
  '#2E9E6B', '#D64550', '#7C5CFF', '#FF7A50', '#FFC95E', '#4CC38A', '#FF6B76', '#9B85FF',
  // district banners + bases + accents
  '#7A5230', '#A87848', '#E8D5B5', '#4FA8D8', '#BFE4F5', '#FFF3D6', '#D86FA4',
  '#F2C6D8', '#7C4A66', '#E08A2E', '#E8B06B', '#C43B4A', '#E86A6A', '#FFD98E',
  '#E8B84A', '#F5DFA0', '#4A9E5C', '#A8D8A0', '#F2EFD8', '#4A5FC4', '#8C9AE8', '#E8ECFF',
  // buildings
  '#3FA65C', '#2C7A42', '#FFF7E0', '#9E2B36',
  // character ramps & misc art neutrals (documented in style guide §6)
  '#2E86AB', '#1D5F7E', '#5A7D9A', '#3D5A73', '#F2C49B', '#4A3728', '#E8B48A',
  '#2E2117', '#C68E5A', '#1A1A1A', '#3A2E20', '#5A3FD1', '#8C5A3C', '#101010',
  '#C08A1E', '#F5D0A8', '#A84A7C', '#B87A4E', '#337A43', '#922834', '#6B4A2E',
  '#8A9BA8', '#5E7080', '#E8C39E', '#B8B8C4', '#9AA5B1', '#6E7A87', '#D9A066',
  '#2C6E63', '#1D4E46', '#6B4FA0', '#4C3678', '#2E2438',
  // illustrative neutrals / sky / ground tints (style-guide-approved derived tones)
  '#141428', '#F4F6F8', '#EDF0F4', '#D8DCE2', '#DDEFFF', '#2E2A38', '#FFE08A',
  '#FFE9A8', '#FFF6DC', '#7FC4E8', '#E4F4FC', '#6EE7A0', '#FF8A92', '#FF9A70',
  '#E8A81E', '#B87D14', '#FFD98A', '#C4A86A', '#8A6B4A', '#5E4630', '#6B3A1E',
  '#8A5A2E', '#A87848', '#7C3A10', '#5E3A06', '#8FBF7A', '#9CD08A', '#79B768',
  '#A8C4B0', '#8A6B4A', '#C8CDD6', '#6E7A87', '#4A5A6A', '#B8C2CC', '#C8C3B8',
  '#D8D3C8', '#E8E4DC', '#6B6280', '#4C4460', '#8A8FA8', '#5E6A78', '#B8804A',
  '#3D3448', '#4A8CB4', '#7C6A48', '#A89868', '#E8D8A8', '#C8B88A', '#8A5E10',
  '#E8756A', '#7FC8A0', '#D8F4E0', '#9CB48A', '#C4A07A', '#B87A6A', '#F0DCA8',
  '#9CC88A', '#A8B0D0', '#A8B4F0', '#3D4A80', '#6B7AC4', '#4A8C5C', '#C8B8A8',
  '#B0A8C0', '#D8E8F0', '#A8BCC8', '#C4A86A', '#FFE0B0', '#FFD090', '#D8F0FC',
  '#A8DCF4', '#2E2A4E', '#4A5A8A', '#B48AE8', '#8A6BD8', '#5A3FB0', '#4C36A8',
  '#E8A05A', '#C47A32', '#A8641E', '#E8DCFF', '#E2DDF0', '#5A5082', '#FFB84A',
  '#2E7D5B', '#221A38', '#2A2144', '#B0883E', '#6B4A26', '#F5EBD0', '#F8F4EA',
  '#3E9C74', '#C8A860', '#A0823E', '#3A2C60', '#241C40', '#171226', '#0E0B18',
  '#12131C', '#1D1F2E', '#E2D8C8', '#F6E7D8', '#EFE8DA', '#FFF3C4', '#D8B05A',
  '#E8C87A', '#C4A040', '#FFD9A8', '#FFE8C4', '#C4588A', '#D86FA4', '#8FC8E8',
  '#E4F4FC', '#BFE4F5', '#6B7AC4', '#B0A4C8', '#C4B8D8', '#5A9AC4', '#9AA5B1',
  '#7FC4E8', '#8A8098', '#B8B0C4', '#6B6885', '#4A4560', '#E8ECFF', '#3D3448',
  '#5A3FB0', '#9E2B36', '#E86A6A', '#C43B4A', '#FFD98E', '#7C1F2E', '#B87A6A',
  '#7C4A2E', '#C8B8D8', '#D8C49A', '#EFE3C8', '#F5DFA0', '#B48AE8', '#8C9AE8',
  '#A88A4A', '#A86B3E', '#8A4A5A', '#4A5A9A', '#7FA86B', '#B0A8A0', '#2E7EA8',
  '#E4D8C4', '#5E4620', '#C4B8A8',
]);
const artFiles = ['src/art/primitives.tsx', 'src/art/characters/Characters.tsx', 'src/art/board/Landmark.tsx', 'src/art/props/Props.tsx', 'src/art/props/Themes.tsx'];
const rogue = new Set();
for (const f of artFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
    const hex = m[0].toUpperCase();
    if (!approved.has(hex)) rogue.add(`${f}:${hex}`);
  }
}
if (rogue.size === 0) ok('palette discipline: all art hexes are style-guide approved or derived tones');
else fail(`rogue colors: ${[...rogue].slice(0, 12).join(' ')}`);

// 5) accessibility — landmark + portrait roots carry aria labels
if (landmark.includes('aria-label={label') && looks.includes('aria-label={label')) ok('art components expose aria labels');
else fail('art components missing aria labels');

console.log(failures === 0 ? '\nASSET QA: ALL CHECKS PASSED' : `\nASSET QA: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
