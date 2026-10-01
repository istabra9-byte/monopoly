/**
 * FirebaseAdapter — online multiplayer over Firebase Realtime Database
 * (modular v9+). Host-authoritative: guests push to /actions, the host
 * applies and writes /state. Anonymous Auth + onDisconnect presence.
 *
 * DB structure (see firebase.database.rules.json):
 *   /rooms/{code}/meta            hostId, status, createdAt, maxPlayers
 *   /rooms/{code}/players/{uid}   name, character, connected, lastSeen, ready
 *   /rooms/{code}/state           latest snapshot (host-only writes)
 *   /rooms/{code}/actions/{id}    guest action queue (removed after apply)
 *   /rooms/{code}/events          recent events for animation/sound
 *   /rooms/{code}/chat            messages (length-limited)
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getDatabase, ref, push, set, update, remove, get, onValue, onChildAdded,
  onDisconnect, serverTimestamp, type Database,
} from 'firebase/database';
import {
  getAuth, signInAnonymously, onAuthStateChanged, type Auth,
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase.config';
import type { GameState, GameAction } from '../engines/types';
import type { NetworkAdapter, PlayerProfile, RoomInfo } from './NetworkAdapter';
import { makeRoomCode, isValidRoomCode } from './NetworkAdapter';

interface RoomMeta {
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  createdAt: number;
  maxPlayers: number;
  settings?: Record<string, unknown>;
}

export class FirebaseAdapter implements NetworkAdapter {
  readonly kind = 'firebase' as const;
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private auth: Auth | null = null;
  private uid: string | null = null;
  private code: string | null = null;
  private isHost = false;
  private lastPing = 0;
  private latency = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private unsubs: Array<() => void> = [];

  private stateCb: ((s: GameState) => void) | null = null;
  private roomCb: ((info: RoomInfo) => void) | null = null;
  private joinCb: ((uid: string, p: PlayerProfile) => void) | null = null;
  private leaveCb: ((uid: string) => void) | null = null;
  private errorCb: ((m: string) => void) | null = null;
  private chatCb: ((m: { uid: string; name: string; text: string; ts: number }) => void) | null = null;

  private myProfile: PlayerProfile | null = null;
  private appliedActionIds = new Set<string>();

  async connect(): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('online.missingConfig');
    }
    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);
    await signInAnonymously(this.auth);
    return new Promise((resolve) => {
      const off = onAuthStateChanged(this.auth!, (user) => {
        if (user) {
          this.uid = user.uid;
          off();
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.db && this.uid && this.code) {
      await remove(ref(this.db, `rooms/${this.code}/players/${this.uid}`)).catch(() => { });
    }
    this.code = null;
  }

  getLatency(): number {
    return this.latency;
  }

  private room(path: string) {
    return ref(this.db!, `rooms/${this.code}/${path}`);
  }

  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      if (!this.db || !this.uid || !this.code) return;
      update(this.room(`players/${this.uid}`), { lastSeen: Date.now(), connected: true }).catch(() => { });
      // latency probe via .info/serverTimeOffset-ish round trip
      this.lastPing = Date.now();
      update(this.room(`ping/${this.uid}`), { ts: Date.now() }).catch(() => { });
    }, 5000);
  }

  async createRoom(profile: PlayerProfile, maxPlayers = 6): Promise<string> {
    this.myProfile = profile;
    this.isHost = true;
    // find a free code (retry up to 5 times)
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeRoomCode();
      const metaRef = ref(this.db!, `rooms/${code}/meta`);
      const snap = await get(metaRef).catch(() => null);
      if (snap?.exists()) continue;
      const meta: RoomMeta = {
        hostId: this.uid!,
        status: 'lobby',
        createdAt: Date.now(),
        maxPlayers,
      };
      await set(metaRef, meta);
      await set(ref(this.db!, `rooms/${code}/players/${this.uid}`), {
        name: profile.name, character: profile.characterId,
        connected: true, lastSeen: Date.now(), isBot: false, ready: true,
      });
      const connRef = ref(this.db!, `rooms/${code}/players/${this.uid}/connected`);
      await onDisconnect(connRef).set(false);
      this.attachRoomListeners(code);
      this.startHeartbeat();
      return code;
    }
    throw new Error('online.roomCreateFailed');
  }

  async joinRoom(codeRaw: string, profile: PlayerProfile): Promise<void> {
    const code = codeRaw.trim().toUpperCase();
    if (!isValidRoomCode(code)) throw new Error('online.badCode');
    this.myProfile = profile;
    this.isHost = false;
    const metaRef = ref(this.db!, `rooms/${code}/meta`);
    const metaSnap = await get(metaRef);
    if (!metaSnap.exists()) throw new Error('online.roomNotFound');
    const meta = metaSnap.val() as RoomMeta;
    if (meta.status === 'finished') throw new Error('online.roomFinished');

    const playersSnap = await get(ref(this.db!, `rooms/${code}/players`));
    const players = (playersSnap.val() ?? {}) as Record<string, unknown>;
    const existing = players[this.uid!];

    if (existing && meta.hostId !== this.uid) {
      // rejoin after crash with same anonymous uid
      await update(ref(this.db!, `rooms/${code}/players/${this.uid}`), {
        connected: true, lastSeen: Date.now(),
        name: profile.name, character: profile.characterId,
      });
    } else {
      const count = Object.keys(players).length;
      if (count >= meta.maxPlayers) throw new Error('online.roomFull');
      await set(ref(this.db!, `rooms/${code}/players/${this.uid}`), {
        name: profile.name, character: profile.characterId,
        connected: true, lastSeen: Date.now(), isBot: false, ready: false,
      });
      const connRef = ref(this.db!, `rooms/${code}/players/${this.uid}/connected`);
      await onDisconnect(connRef).set(false);
    }

    this.attachRoomListeners(code);
    this.startHeartbeat();
  }

  private attachRoomListeners(code: string): void {
    this.code = code;

    // room info
    const offRoom = onValue(ref(this.db!, `rooms/${code}/meta`), (snap) => {
      const meta = snap.val() as RoomMeta | null;
      if (!meta) return;
      this.emitRoomInfo(code, meta);
    });
    this.unsubs.push(offRoom);

    const offPlayers = onValue(ref(this.db!, `rooms/${code}/players`), (snap) => {
      const players = (snap.val() ?? {}) as Record<string, { name: string; character: string; connected: boolean; isBot?: boolean; botDifficulty?: string; ready?: boolean }>;
      Object.entries(players).forEach(([uid, p]) => {
        this.joinCb?.(uid, {
          name: p.name, characterId: p.character,
          isBot: p.isBot, botDifficulty: (p.botDifficulty as 'easy' | 'normal' | 'hard') ?? 'normal',
        });
      });
      this.emitRoomInfo(code, null, players);
    });
    this.unsubs.push(offPlayers);

    // state snapshots
    const offState = onValue(ref(this.db!, `rooms/${code}/state`), (snap) => {
      const s = snap.val() as GameState | null;
      if (s && !this.isHost) this.stateCb?.(s);
    });
    this.unsubs.push(offState);

    // chat
    const offChat = onChildAdded(ref(this.db!, `rooms/${code}/chat`), (snap) => {
      const m = snap.val() as { uid: string; name: string; text: string; ts: number } | null;
      if (m) this.chatCb?.(m);
    });
    this.unsubs.push(offChat);

    if (this.isHost) {
      // guest actions queue
      const offActions = onChildAdded(ref(this.db!, `rooms/${code}/actions`), (snap) => {
        const action = snap.val() as GameAction & { __uid: string } | null;
        if (!action) return;
        if (this.appliedActionIds.has(snap.key ?? '')) return;
        this.appliedActionIds.add(snap.key ?? '');
        // only accept actions from their own uid
        if (action.__uid !== this.uid) {
          window.dispatchEvent(new CustomEvent('ec-remote-action', { detail: { action, uid: action.__uid, key: snap.key } }));
        }
        void remove(snap.ref);
      });
      this.unsubs.push(offActions);

      // latency probe echo
      const offPing = onValue(ref(this.db!, `rooms/${code}/ping`), (snap) => {
        const pings = (snap.val() ?? {}) as Record<string, { ts: number }>;
        if (this.uid && pings[this.uid]) {
          this.latency = Math.max(0, Date.now() - pings[this.uid].ts);
        }
      });
      this.unsubs.push(offPing);

      // room expiry sweeper: drop rooms older than 12h
      void removeOldRooms(this.db!);
    }

    // latency for guests
    if (!this.isHost) {
      const offPing = onValue(ref(this.db!, `rooms/${code}/ping/${this.uid}`), (snap) => {
        const v = snap.val() as { ts: number } | null;
        if (v?.ts) this.latency = Math.max(0, Date.now() - v.ts);
      });
      this.unsubs.push(offPing);
    }
  }

  private emitRoomInfo(code: string, meta: RoomMeta | null, playersRaw?: Record<string, unknown>): void {
    void playersRaw;
    // RoomInfo assembly happens in the lobby via onRoomInfo using latest meta+players
    if (meta) this.lastMeta = { code, meta };
    if (this.lastMeta && this.lastPlayers) {
      this.roomCb?.({
        code: this.lastMeta.code,
        hostId: this.lastMeta.meta.hostId,
        status: this.lastMeta.meta.status,
        maxPlayers: this.lastMeta.meta.maxPlayers,
        settings: this.lastMeta.meta.settings,
        players: Object.entries(this.lastPlayers).map(([uid, p]) => {
          const pp = p as { name: string; character: string; connected: boolean; ready?: boolean };
          return { uid, profile: { name: pp.name, characterId: pp.character }, connected: pp.connected, ready: pp.ready ?? false };
        }),
      });
    }
  }

  private lastMeta: { code: string; meta: RoomMeta } | null = null;
  private lastPlayers: Record<string, unknown> | null = null;

  sendAction(action: GameAction): void {
    if (!this.db || !this.code || this.isHost) return;
    void push(this.room('actions'), { ...action, __uid: this.uid });
  }

  publishState(state: GameState): void {
    if (!this.db || !this.code || !this.isHost) return;
    void set(this.room('state'), JSON.parse(JSON.stringify(state)));
  }

  async markStarted(): Promise<void> {
    if (!this.db || !this.code || !this.isHost) return;
    await update(ref(this.db!, `rooms/${this.code}/meta`), { status: 'playing' });
  }

  onState(cb: (state: GameState) => void): void { this.stateCb = cb; }
  onRoomInfo(cb: (info: RoomInfo) => void): void {
    this.roomCb = cb;
    this.lastPlayers = this.lastPlayers; // trigger assembly on both listeners present
  }
  onPlayerJoin(cb: (uid: string, profile: PlayerProfile) => void): void {
    this.joinCb = (uid, p) => {
      this.lastPlayers = this.lastPlayers ?? {};
      cb(uid, p);
    };
  }
  onPlayerLeave(cb: (uid: string) => void): void { this.leaveCb = cb; }
  onError(cb: (message: string) => void): void { this.errorCb = cb; }
  onChat(cb: (msg: { uid: string; name: string; text: string; ts: number }) => void): void { this.chatCb = cb; }

  sendChat(text: string): void {
    if (!this.db || !this.code || !this.myProfile) return;
    void push(this.room('chat'), {
      uid: this.uid, name: this.myProfile.name, text: text.slice(0, 140), ts: Date.now(),
    });
  }

  /** Host: register bots as players rows. */
  async addBot(code: string, botId: string, name: string, characterId: string, difficulty: string): Promise<void> {
    if (!this.db) return;
    await set(ref(this.db, `rooms/${code}/players/bot-${botId}`), {
      name, character: characterId, connected: true, lastSeen: Date.now(),
      isBot: true, botDifficulty: difficulty, ready: true,
    });
  }

  async setReady(code: string, ready: boolean): Promise<void> {
    if (!this.db || !this.uid) return;
    await update(ref(this.db, `rooms/${code}/players/${this.uid}`), { ready });
  }

  async kick(code: string, uid: string): Promise<void> {
    if (!this.db || !this.isHost) return;
    await remove(ref(this.db, `rooms/${code}/players/${uid}`));
  }
}

async function removeOldRooms(db: Database): Promise<void> {
  try {
    const cutoff = Date.now() - 12 * 3600 * 1000;
    const snap = await get(ref(db, 'rooms'));
    if (!snap.exists()) return;
    const rooms = snap.val() as Record<string, { meta?: { createdAt?: number } }>;
    for (const [code, room] of Object.entries(rooms)) {
      if ((room.meta?.createdAt ?? 0) < cutoff) {
        void remove(ref(db, `rooms/${code}`));
      }
    }
  } catch { /* best effort */ }
}

export { serverTimestamp };
