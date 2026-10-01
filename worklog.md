---
Task ID: 1-11
Agent: main (Super Z)
Task: Build "Empire City" — complete premium mobile-first board game

Work Log:
- Phase 0: sandbox mandates Next.js 16 (React 19) — deviation from Vite/React 18 documented; installed firebase/qrcode/jsqr/vitest.
- Phase 1: docs/art-style-guide.md + docs/asset-manifest.md written BEFORE assets; 40-space board data (8 districts, original names), 32 cards, 12 characters.
- Phase 2: pure-TS engines: rng (mulberry32), rulesEngine (deterministic FSM), economy (rent/build/mortgage/debt/bankruptcy), cards (chained effects), trade, auction, types; strict tsc clean.
- Phase 3: original SVG art system — primitives, 12 parametric characters × 8 emotions + pawns, 36 landmark scenes covering all 40 spaces, buildings/dice/money/cards/FX/3 themes.
- Phase 4: Zustand store bridge + bot loop + FX queue; screens: splash/menu/setup/game/results/settings/tutorial/join; sheets: property/assets/trade/auction/card/log.
- Phase 5: pawn hop pathing, CSS-3D guided dice, card flip, floats, confetti; Web Audio synth engine (SFX+music, no files); haptics.
- Phase 6: AIEngine 3 difficulties × personalities; fixed trade-proposal ping-pong (cooldown), bank-supply-aware liquidation (shared canBuild/canSell predicates), integer-safe mortgage interest.
- Phase 7: NetworkAdapter + FirebaseAdapter (rooms/actions/state/chat/ping, onDisconnect presence, rejoin, expiry sweeper) + hardened database rules + setup guide.
- Phase 8: LanAdapter (WebRTC data channels, QR offer/answer handshake, host-candidates-only ICE, manual fallback) + QR scanner UI.
- Phase 9: IndexedDB SaveEngine (auto-save/resume/verified in browser), settings with persistence, i18n EN/AR/FR with full RTL (verified), tutorial, PWA (manifest+SW+icons).
- Phase 10: 28 unit tests green; 1000/1000 headless bot games completed (chunks of 250; avg 376 turns; zero deadlocks/invalid states); ESLint + tsc clean.
- Phase 11: Agent Browser E2E verified: splash→menu→setup→game; roll/buy/auction (bid+pass+settle)/cards/bots loop; resume; RTL; desktop viewport. Fixed during verification: layout height (absolute-fill screens), i18n key prefixes, auction sheet auto-open, theme keys, rentWith labels.

Stage Summary:
- Deliverable: full game at src/, docs in docs/, tests in tests/, PWA in public/.
- Verified end-to-end in browser at mobile + desktop viewports; Arabic RTL confirmed.
- 1000-game simulation invariant-clean. Known limitations listed honestly in CHANGELOG.md.
