# Firebase Setup Guide (Online Mode)

Empire City uses **Firebase Realtime Database + Anonymous Authentication**
(modular v9+ web SDK). A working project config is already built in
(`src/config/firebase.config.ts`); follow these steps to use your own project.

## 1. Create the project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. Name it (e.g. `empire-city`); Google Analytics optional.

## 2. Register a Web app

1. Project overview → **</>** (Web) → nickname `empire-city-web`.
2. Copy the `firebaseConfig` object values.

## 3. Enable Realtime Database

1. Build → **Realtime Database** → Create Database.
2. Choose a region close to your players (e.g. `europe-west1`).
3. Start in **locked mode** — we deploy strict rules next.

## 4. Enable Anonymous Auth

1. Build → **Authentication** → Get started.
2. **Sign-in method** → **Anonymous** → Enable.

## 5. Point the app at your project

Copy `.env.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://<your-db>.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Never commit `.env.local`. Without these vars the game falls back to the
built-in config; if neither exists, Online mode shows a friendly
"not configured" message instead of crashing.

## 6. Deploy security rules

The rules live in `firebase.database.rules.json`:

- everything requires `auth != null` (anonymous counts);
- only the host writes `/meta` and `/state`;
- guests write only their own `/players/{uid}` row and their own `/actions`
  entries (`__uid === auth.uid` validated);
- chat messages are length-limited (≤140 chars) and owned by their author;
- ping/latency rows are per-uid.

Deploy:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only database --project <your-project-id>
```

(Or paste the JSON into Console → Realtime Database → Rules.)

## 7. Data model

```
rooms/{code}/meta           hostId, status(lobby|playing|finished), createdAt, maxPlayers
rooms/{code}/players/{uid}  name, character, connected, lastSeen, isBot, ready
rooms/{code}/state          latest authoritative GameState snapshot (host-only)
rooms/{code}/actions/{id}   guest action queue — {type, playerId, payload…, __uid}
rooms/{code}/events         recent events for animation/sound (host-only)
rooms/{code}/chat/{id}      {uid, name, text≤140, ts}
rooms/{code}/ping/{uid}     latency probes
```

- Rooms older than 12h are swept by the host on room creation.
- `onDisconnect()` flips `connected=false`; a 5s heartbeat refreshes `lastSeen`.
- Reconnect: a guest returning with the **same anonymous uid** (browser
  storage persists it) updates its player row and receives the next `/state`
  snapshot — hosts snapshot every action, so resync is automatic.

## 8. Local emulator testing

```bash
firebase emulators:start --only database,auth
# in another shell
NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://localhost:9000?ns=emulator-demo \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost \
  bun run dev
```

Rules can be unit-tested with `@firebase/rules-unit-testing` against the
emulator; the key assertion is that a guest write to `/rooms/{code}/state`
is rejected while the host's write succeeds.
