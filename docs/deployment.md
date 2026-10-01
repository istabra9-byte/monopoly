# Deployment Guide

## Vercel (recommended)

1. Push the repository to GitHub/GitLab.
2. <https://vercel.com/new> → import the repo.
3. Framework preset: **Next.js** (auto-detected). No build overrides needed.
4. Environment variables: add the `NEXT_PUBLIC_FIREBASE_*` pair from
   `docs/firebase-setup.md` (optional — built-in defaults exist).
5. Deploy. Done — PWA + service worker are served from `public/`.

For Firebase, also add your production domain to
**Authentication → Settings → Authorized domains**.

## Netlify

1. New site → import repo.
2. Build command: `bun run build` (or `npx next build`).
3. The repo's `next.config.ts` uses standalone output for containers; Netlify's
   Next runtime handles it automatically via the official plugin.
4. Add the same environment variables.

## Self-host / Docker-ish (Node)

```bash
bun install
bun run build        # produces .next/standalone
bun run start        # serves on :3000 (PORT env to change)
```

The `build` script already copies `.next/static` and `public/` into the
standalone output.

## Static export?

Not supported: Online mode uses Firebase client SDK only (could be static),
but the Next.js server route is kept for future anti-cheat validation and
lobby matchmaking. If you need a 100% static bundle for LAN-only usage,
`next build` with `output: 'export'` works — remove the `sw.js` scope caveat
and Firebase config remains client-side.

## Post-deploy checklist

- [ ] Lighthouse mobile ≥90 (Performance/A11y/BP/PWA) on the deployed URL
- [ ] Install-to-homescreen works (manifest + SW registered, production only)
- [ ] Online mode: create room on phone A, join from phone B
- [ ] LAN mode: both phones on same Wi-Fi, QR handshake completes
- [ ] Airplane-mode solo game runs entirely offline
