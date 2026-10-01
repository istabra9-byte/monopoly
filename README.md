# Empire City 🏙️

**A premium, mobile-first property-trading board game.** Solo vs bots, local-network
multiplayer, and online play. 100% original world and artwork — no copyrighted names,
characters, or board designs.

![tech](https://img.shields.io/badge/Next.js%2016-React%2019-black) ![ts](https://img.shields.io/badge/TypeScript-strict-blue) ![tests](https://img.shields.io/badge/simulations-1000%2F1000-green)

---

## Quick start

```bash
bun install          # or npm install
bun run dev          # dev server on :3000 (auto-started in this sandbox)
bun run lint         # eslint
bunx vitest run      # engine tests + bot-vs-bot simulation
```

Production build:

```bash
bun run build && bun run start   # standalone server on :3000
```

Deploy on Vercel/Netlify: see **docs/deployment.md**. Online multiplayer setup:
see **docs/firebase-setup.md**.

## Architecture

```
src/
├── engines/        PURE TypeScript game core (zero UI imports)
│   ├── types.ts         state, actions, events — fully serializable
│   ├── rulesEngine.ts   deterministic state machine: state' = f(state, action)
│   ├── economyEngine.ts rent, build, mortgage, liquidation, bankruptcy
│   ├── cardEngine.ts    32-card decks, effect application + chains
│   ├── tradeEngine.ts   offer validation + execution
│   ├── auctionEngine.ts bidding rounds, settlement
│   ├── aiEngine.ts      3 difficulties × 4 personalities
│   └── rng.ts           mulberry32 seeded RNG (dice decided FIRST, then animated)
├── data/board.ts   40 spaces · 8 districts · 12 characters · 32 cards
├── art/            all original SVG illustration system (React components)
├── network/        NetworkAdapter interface + Firebase + WebRTC(LAN) impls
├── state/          Zustand store = engine ⇄ UI bridge (bot loop, FX queue)
├── audio/          Web Audio synthesis (no audio files, works offline)
├── save/           IndexedDB auto-save / slots / export-import
├── i18n/           EN · AR (full RTL) · FR
├── ui/             screens + bottom-sheet components (mobile-first)
└── config/         Firebase config from env vars
docs/               art style guide, asset manifest, guides
tests/              vitest: rules suite + 1000-game headless simulation
```

**Core principle:** engines never import React. The UI subscribes to a Zustand
store; every engine mutation emits events that drive sound, haptics and
animation. Multiplayer is **host-authoritative**: guests send only actions,
the host validates/applies/broadcasts state; hidden info (deck order, RNG
stream) never leaves the host.

## Rules implemented (full classic set)

- 2–6 players, seeded starting cash/GO salary, double salary on GO (toggle)
- Buy or **auction** unowned properties (auction toggle); real bidding rounds
- Rent: monopoly doubling, houses/hotels, stations by count, utilities ×4/×10 dice
- Even-build rule + limited bank supply (32 houses / 12 hotels), half-price sell-back
- Mortgage (half value) / unmortgage (+10% interest)
- Jail: 3 exits (fine / card / doubles), max 3 attempts, rent while jailed
- Income & luxury taxes; optional free-parking jackpot (off by default)
- Doubles → extra turn; 3 doubles → jail
- Chance & Community Chest: 16 cards each, all classic effects, jail-free cards
  tracked out of circulation until used, chained card resolution (back-3 onto
  another card deck works)
- Trades: cash + properties + jail cards, counter-offers, no-buildings rule
- Debt phase: liquidate (sell/mortgage) or declare bankruptcy; assets transfer
  to creditor (or bank); last player standing wins
- Optional **sudden death**: at N turns the richest player wins (guarantees
  termination; 80/150/250/unlimited)
- Full action log, deterministic replay (same seed + actions ⇒ same state)

## Game modes

| Mode | Transport | Players |
|---|---|---|
| Solo vs Bots | in-process (LocalAdapter semantics) | 1 + 1–5 bots |
| Local Network | WebRTC data channels + QR signaling, no internet | 2–6 |
| Online | Firebase Realtime Database + Anonymous Auth | 2–6 |

## Testing

```bash
bunx vitest run tests/engines      # 28 rule-level unit tests
SIM_GAMES=1000 bunx vitest run tests/sim   # headless bot-vs-bot simulation
```

The simulation asserts per-action invariants (non-negative integer cash,
valid owners, house bounds, phase validity, winner-on-game-over) and ran
**1000/1000 games to completion** (avg 376 turns) with zero deadlocks,
crashes or invalid states.

## Adding content

- **Theme:** add a `ThemeDef` in `src/art/props/Themes.tsx`, wire into `THEMES`.
- **Language:** add a dictionary in `src/i18n/index.ts` + register in `DICTS`.
- **Character:** add a look in `src/art/characters/Characters.tsx` (`LOOKS`) and
  an entry in `CHARACTERS` (auto-appears in setup, lobby and bot pool).
- **Board space:** edit `src/data/board.ts` (prices/rents are data-driven) and
  add a landmark scene in `src/art/board/Landmark.tsx`.

## Known limitations

See **CHANGELOG.md** § Known limitations for the honest list (physics dice is
CSS-guided rather than cannon-es; Firebase emulator tests require local
emulator suite; board tiles are upright rather than rotated per side, etc).
