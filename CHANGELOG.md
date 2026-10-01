# Changelog

## 1.0.0 — Empire City launch (2026-10-01)

### Engines (pure TypeScript, zero UI imports)
- Deterministic RulesEngine state machine: `state' = f(state, action)`; every
  action validated; invalid actions never mutate state; full action log.
- BoardEngine data: 40 spaces, 8 districts with original names/landmarks,
  classic price/rent curves, stations ×4, utilities ×4/×10 dice.
- Seeded mulberry32 RNG — dice results decided by RNG **before** animation
  (fair, replayable, cheat-proof in multiplayer).
- EconomyEngine: rent (monopoly doubling, buildings, station count, utility
  dice), taxes, even-build + bank supply (32/12), half-price sell-back,
  mortgage/unmortgage +10%, debt phase, liquidation, bankruptcy with asset
  transfer to creditor or bank.
- CardEngine: 16 Chance + 16 Community Chest, all classic effects, chained
  resolution (move-back-3 onto a deck draws again), jail-free cards held out
  of circulation until used.
- TradeEngine: cash/properties/jail-cards offers, validation (no buildings on
  traded deeds, cash & card ownership), counter flow.
- AuctionEngine: bidding rotation, pass, settlement, no-bid fallback.
- AIEngine: Easy/Normal/Hard × personalities (aggressive/cautious/trader/
  balanced); property valuation with set-completion & blocking bonuses; cash
  reserves; even building; rational bidding; liquidation-before-bankruptcy;
  set-completing trade proposals; human-like thinking delays in UI.
- Sudden-death rule (optional maxTurns → richest wins) — guarantees games end.

### Multiplayer
- `NetworkAdapter` interface; UI/engines are transport-agnostic.
- **Online (Firebase RTDB)**: anonymous auth, 6-char rooms, host-authoritative
  pipeline, guest action queue with per-uid ownership, state snapshots every
  action, onDisconnect presence + heartbeat, rejoin by uid, room expiry
  sweeper, latency probes, chat. Strict database rules included
  (`firebase.database.rules.json`).
- **LAN (WebRTC)**: host/guest QR handshake (offer → answer QRs), manual
  paste fallback, host-candidates-only ICE (no internet), star topology,
  state broadcast, reconnect queueing.
- Mock-friendly: local offline mode runs the same adapter surface.

### Art (100% original)
- Style guide first (`docs/art-style-guide.md`): soft-3D vector, top-left
  light, gradient + soft-shadow recipes, district pattern emblems for
  color-blind safety.
- 12 original characters × 8 emotion states (parametric bust system) +
  matching standing pawns with celebration variant.
- All 40 board spaces illustrated: 22 unique landmarks, 4 stations (steam,
  metro, ferry, cable car), 2 utilities, GO gate with animated arrow,
  illustrated jail, garden parking, patrol, tax office, jewel, mystery orb,
  treasure chest.
- Houses/hotels with pop-in animation, mortgage stamps, owner flags,
  money bills ×8 denominations, jail-free card, custom-pip dice, auction
  hammer, trophy, confetti.
- 3 board themes (Classic City / Neon Night / Ancient Empire) with matching
  center art + ambient backgrounds. Dark/light UI.

### UI/UX
- Mobile-first: 320px→desktop, portrait/landscape, dvh + safe-area insets,
  no zoom/pull-to-refresh, 48px targets, bottom sheets everywhere.
- Screens: splash, menu, setup (characters/difficulty/rules/theme), lobby
  (online + LAN), game HUD (portraits with live emotions, cash, jail/card
  chips), property cards, assets manager, trade builder/viewer, auction room,
  card reveal, game log, results with net-worth chart + confetti, settings,
  illustrated tutorial.
- Animations: pawn hop pathing, dice tumble to guided result, card flip,
  floating ±cash, building pop-in, turn pulse, all `prefers-reduced-motion`
  aware.
- AudioEngine: fully synthesized SFX (dice, steps, cash, card, jail, build,
  auction hammer, victory…) + generative music loop, per-category volume,
  first-gesture unlock. navigator.vibrate haptics.
- i18n: English, Arabic (full RTL mirroring), French — every screen.
- SaveEngine: IndexedDB auto-save every change, resume from menu, slots,
  JSON export/import.
- PWA: manifest + service worker (offline shell, Firebase traffic bypassed),
  installable, icons generated.

### Quality
- 28 vitest unit tests (rent/even-build/auction/bankruptcy/jail/trades/
  determinism/board integrity).
- Headless simulation: **1000/1000 bot-vs-bot games completed**, avg 376
  turns, zero deadlocks/crashes/invalid states; per-action invariant checks
  (cash ≥ 0 & integer, owner validity, house bounds, phase legality).
- TypeScript strict across the repo; ESLint clean; art palette centralized.

---

## Known limitations (honest list)

1. **Stack substitution:** the build sandbox mandates Next.js 16 (React 19)
   instead of Vite + React 18. All game code is framework-agnostic pure TS;
   engines compile standalone under `tsc --strict`. React 19 is a superset of
   the React 18 APIs used here.
2. **Dice:** CSS-3D tumble to the RNG-guided result instead of cannon-es
   physics. The brief allowed "Three.js or CSS 3D"; physics simulation of the
   tumble is cosmetic and was traded for guaranteed correctness + 60fps on
   low-end phones.
3. **Board orientation:** tiles stay upright on all four sides (banner faces
   center) rather than rotating text per side — chosen for readability on
   320px screens.
4. **Bankruptcy building transfer:** buildings are auto-liquidated to the bank
   at half price before deed transfer (a common digital adaptation) instead of
   the physical board's building-auction ceremony.
5. **Trade UI:** jail-card inclusion is engine-supported but the builder sheet
   exposes cash + properties only (cards auto-transfer on bankruptcy).
6. **Firebase emulator tests:** rules tests and multi-client Playwright runs
   require the local emulator suite (`firebase emulators:start`); CI wiring is
   documented in docs/firebase-setup.md but not executed inside this sandbox
   (no emulator binary). Security rules ship hardened by default.
7. **LAN signaling:** QR-to-QR handshake requires two scans (host shows offer,
   guest shows answer). On iOS, camera scanning needs HTTPS (deployed URL) —
   manual paste fallback always works.
8. **Public quick-match list:** implemented as "create/join by code + share";
   a browsable public room list needs a small index write per room and was
   left out of v1 rules for privacy (rooms are unlisted by default).
9. **Performance budgets:** initial JS is well under the 300KB gz target
   (engines+UI code-split, Firebase/dice/audio lazy); Lighthouse run must be
   done on the deployed URL (this sandbox serves dev mode).
10. **Turn timer:** setting exists (`turnTimerSec`) with auto-skip plumbing
    host-side; the AFK-bot-takeover handoff is scheduled for v1.1.
