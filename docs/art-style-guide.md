# Empire City — Art Style Guide

> Version 1.0 · All artwork is 100% original. No copyrighted characters, logos,
> mascot figures or board artwork from any existing property-trading game are
> used or imitated.

## 1. Global art direction

**Style:** Soft-3D stylized vector illustration. Rounded, chunky, friendly
forms built from layered vector shapes with smooth vertical gradients, one
consistent light direction and soft ambient-occlusion shadows. The look sits
between a modern city-builder mobile game and an animated family film poster.

**Silhouette first:** every landmark, character and token must be recognizable
from its outline alone (accessibility requirement — color is never the only
carrier of meaning).

**Light direction:** top-left (highlight edges on upper-left, shade on
lower-right of every form). Applies to characters, buildings, pawns, dice.

## 2. Palette system

### 2.1 Core UI palette

| Token | Hex (Light) | Hex (Dark) | Usage |
|---|---|---|---|
| `--bg` | #F4EFE6 warm paper | #12131C night | app background |
| `--surface` | #FFFFFF | #1D1F2E | cards, sheets |
| `--ink` | #26243B | #F2F0FF | primary text |
| `--ink-soft` | #6B6885 | #A7A4C4 | secondary text |
| `--brand` | #E4572E sunset coral | #FF7A50 | primary actions |
| `--brand-deep` | #B23A18 | — | pressed / borders |
| `--gold` | #F2B33D | #FFC95E | money, rewards |
| `--good` | #2E9E6B | #4CC38A | gains, confirm |
| `--bad` | #D64550 | #FF6B76 | losses, danger |
| `--focus` | #7C5CFF | #9B85FF | focus rings, links |

### 2.2 District palette (banner + landmark body colors)

| District | Banner | Landmark base | Accent | Pattern (color-blind cue) |
|---|---|---|---|---|
| Old Docks | #7A5230 | #A87848 wood | #E8D5B5 | diagonal rope stripes |
| Azure Bay | #4FA8D8 | #BFE4F5 sea-glass | #FFF3D6 | wave scallops |
| Old Town | #D86FA4 | #F2C6D8 plaster | #7C4A66 | fleur dots |
| Craft Quarter | #E08A2E | #E8B06B brick | #6B3A1E | brick courses |
| Crimson Quarter | #C43B4A | #E86A6A lacquer | #FFD98E | lantern dots |
| Sunset Palms | #E8B84A | #F5DFA0 sandstone | #4A8C5C | sun rays |
| Verdant Heights | #4A9E5C | #A8D8A0 foliage | #F2EFD8 | leaf veins |
| Imperial Heights | #4A5FC4 | #8C9AE8 glass steel | #E8ECFF | star sparkles |

### 2.3 Buildings

- House: green #3FA65C body, #2C7A42 roof edge, cream windows #FFF7E0.
- Hotel: crimson #D64550 body, #9E2B36 roof edge, gold trim #F2B33D.

## 3. Shape language

- Corner radius scale: `4 / 8 / 12 / 20 / 28 px` (SVG `rx`), all outer
  container corners use 20 or 28; small items 8–12.
- Buildings/props use rounded tops (arched roofs, domes, rounded parapets) —
  no sharp right-angle silhouettes except utility poles/antennae.
- Characters: large heads (≈ 45% of bust height), small bodies, mitten hands,
  no elbows — toy-like proportions.

## 4. Stroke rules

- No hard outer outlines. Depth comes from shading shapes, not line work.
- Optional 1.5px inner detail strokes at 25–35% opacity of a darker tone of
  the fill color (e.g. window frames, wood planks).
- Shadow recipe (every grounded object): an ellipse under the object,
  `fill: rgba(20,20,40,0.18)`, blurred via a radial gradient
  (center 0.28 alpha → edge 0), squashed to 30% height, offset +2px down.

## 5. Lighting recipe

- Each major form gets a vertical linear gradient: lighter at top-left
  (lighten fill by ~18%) → base color at 60% height → darker at bottom-right
  (darken by ~14%).
- A single soft specular highlight (white → transparent, opacity 0.35,
  rounded blob) on the upper-left third of glossy objects (dice, orb, jewel,
  glass towers).
- Cast shadow per §4. Nothing floats without a ground shadow.

## 6. Character system (12 original characters)

Parametric bust portraits + matching standing pawns. Per character:

- Distinct silhouette: hat/hair accessory (sailor cap, chef toque, flight
  helmet, deerstalker, space dome, beret, pith helmet, racing helmet,
  goggles, knight helm, tricorne, magician fez), hair color/style, skin
  tone from a 6-tone inclusive ramp, accent clothing color.
- Accent colors never collide with district banners or house green /
  hotel red.
- Expression layer (eyes + mouth swap) drives the 8 states:
  `idle, happy, sad, angry, thinking, jailed, bankrupt, winner`.
- Overlay layer for special states: jail bars (jailed), slumped posture +
  turned-down mouth (bankrupt), crown + sparkles (winner), sweat-drop +
  thought bubble (thinking), tear-drops (sad), steam puffs (angry).

## 7. Board space illustration system

- Each of the 40 spaces is a framed tile (frame = district banner color on
  the edge strip facing the board center; the face carries an illustrated
  landmark on a soft sky-tinted backdrop).
- Landmarks are built from the shared primitive library (roofs, towers,
  windows, doors, water, trees, lanterns) so all 22 properties read as one
  world, while each landmark keeps a unique silhouette
  (lighthouse, clock tower, floating market, glass skyscraper, temple,
  opera house, botanical dome, harbor bridge, space tower, palace…).
- Railroads/stations: steam train, metro, cable car, ferry — each drawn in
  its own scene, all sharing the transport brand chevron.
- Utilities: power plant (cooled towers + bolt) and water tower (tank + drop).
- Corners: GO start-gate with animated arrow, illustrated jail with bars,
  garden free-parking, patrol figure for Go-To-Jail.
- Chance = Mystery Orb (swirl sphere), Community Chest = Treasure Chest —
  two clearly distinct shapes + matching card backs.

## 8. Motion principles

- 60fps budget; animate only `transform` and `opacity` (GPU-composited).
- Pawn hop: 320ms per space, 14px arc, squash 0.86 on landing.
- Card flip: 420ms rotateY with slight overshoot (1.06 scale at 70%).
- Building pop-in: scale 0.3→1.08→1 (spring), 260ms.
- Cash float: "+$200" rises 28px, fades, 900ms.
- Confetti: 28 pieces, random rotation, 1.4–2.2s, gravity easing.
- All motion respects `prefers-reduced-motion` (opacity-only fallbacks).

## 9. Delivery & QA

- All assets are hand-authored SVG React components (resolution-independent,
  tree-shakeable, gzip-friendly) grouped per family; `aria-hidden` on
  decorative internals and a role="img" + aria-label on meaningful roots.
- `docs/asset-manifest.md` lists every asset family, purpose, and origin
  (all "original vector, hand-authored in-repo").
- Utility UI icons may come from Lucide (open license) — never used for
  board, tokens, characters or places.
- Color-blind safety: every district banner pairs its hue with a unique
  pattern + emblem shape (§2.2); landmarks are shape-unique.

## 10. Asset QA script

`scripts/check-assets.mjs` validates: every manifest entry resolves to a
React component export, every meaningful art component carries an aria label,
and palette literals stay inside the approved style-guide palettes.
