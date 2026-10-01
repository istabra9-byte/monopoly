# Empire City — Asset Manifest

All board/character/prop artwork is **original vector art hand-authored in this
repository** as React SVG components (`src/art/**`). Utility UI icons come from
Lucide (ISC license). No third-party illustrations, no generated rasters, no
copied game artwork. SVG components are resolution-independent and tree-shaken
by the bundler; sprite preloading is unnecessary.

| Family | Components | Purpose | Origin / License |
|---|---|---|---|
| Characters (busts) | `art/characters/CharacterPortrait.tsx` — 12 base looks × 8 expression states, parametric | HUD portraits, dialogs, victory screens | original vector, in-repo |
| Board pawns | `art/characters/Pawn.tsx` — 12 standing pawns, shadow + idle bob | board tokens | original vector, in-repo |
| District landmarks (22) | `art/board/Landmark.tsx` — lighthouse, marina, boardwalk, clocktower, opera, market, glassworks, lantern gate, ember street, dragon bridge, palms, solaris, dunes, botanical dome, harbor bridge, temple, observatory, palace, harbor row, wharf, rose alley, artisan row | property tile faces + property cards | original vector, in-repo |
| Stations (4) | `Landmark.tsx` — steam terminal, metro, ferry, cable car | railroad tiles | original vector, in-repo |
| Utilities (2) | `Landmark.tsx` — power plant, water tower | utility tiles | original vector, in-repo |
| Corners (4) | `Landmark.tsx` — start gate, jail, garden park, patrol | corner tiles | original vector, in-repo |
| Card icons | `art/props/CardIcon.tsx` — mystery orb, treasure chest + 16 effect glyphs, card backs | Chance / Community Chest decks | original vector, in-repo |
| Buildings | `art/props/Buildings.tsx` — house, hotel (per-district tint variants), mortgage stamp, owner flag | build/mortgage states | original vector, in-repo |
| Money & cards | `art/props/Money.tsx` — bills/coins ×5 denominations, jail-free card | cash FX, trade | original vector, in-repo |
| Dice | `art/props/Dice.tsx` — custom-pip die faces, CSS-3D cube | dice roll | original vector, in-repo |
| Backgrounds / themes | `art/props/Backdrops.tsx` — Classic City, Neon Night, Ancient Empire center art + ambient bg | board themes | original vector, in-repo |
| FX | `art/props/Fx.tsx` — confetti, hammer, trophy, sparkles | auction / victory | original vector, in-repo |
| Utility icons | `lucide-react` (settings, volume, wifi, camera, copy, chevrons…) | buttons, chrome only | ISC, npm package |

Naming convention: `ArtCharacter<Look>`, `Pawn`, `Landmark(kind)`,
`HouseIcon`, `HotelIcon`, `DiceFace(n)`, `Backdrop(theme)`, `FxConfetti`.
Every meaningful root carries `role="img"` + `aria-label`; decorative internals
are `aria-hidden="true"`.

District banners pair hue + unique pattern + emblem shape (style guide §2.2)
so color is never the only signal.
