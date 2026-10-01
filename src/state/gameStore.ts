'use client';

/**
 * GameStore — Zustand bridge between the pure engines and React UI.
 * The store owns the authoritative GameState (host), dispatches actions,
 * processes engine events into UI FX (audio/haptics/animations) and drives
 * the bot loop with human-like "thinking" delays.
 */
import { create } from 'zustand';
import type {
  GameState, GameAction, GameEvent, GameSettings,
} from '../engines/types';
import { applyAction, createGame, type PlayerConfig } from '../engines/rulesEngine';
import type { Emotion } from '../art/characters/Characters';
import { decideBotAction, pendingBotIds } from '../engines/aiEngine';

export type Screen =
  | 'splash' | 'menu' | 'setup' | 'lobby' | 'game' | 'results'
  | 'settings' | 'tutorial' | 'join' | 'joinlan';

export type SheetId =
  | 'property' | 'assets' | 'trade' | 'trade-new' | 'auction' | 'card'
  | 'log' | 'menu' | 'stats' | null;

export interface FxItem {
  id: number;
  event: GameEvent;
}

export interface FloatText {
  id: number;
  playerId?: string;
  spaceId?: number;
  text: string;
  tone: 'gain' | 'loss';
}

export type NetMode = 'offline' | 'lan' | 'online';

interface GameStore {
  // game
  state: GameState | null;
  mode: NetMode;
  isHost: boolean;
  localPlayerId: string | null;
  actionError: string | null;
  // fx
  fx: FxItem[];
  floats: FloatText[];
  lastDice: { d1: number; d2: number; key: number } | null;
  moveAnim: { playerId: string; path: number[]; key: number } | null;
  // ui
  screen: Screen;
  sheet: SheetId;
  selectedSpaceId: number | null;
  pendingSpaceView: number | null;
  reducedMotion: boolean;
  // internal
  fxSeq: number;
  botTimer: ReturnType<typeof setTimeout> | null;

  // actions
  setScreen: (s: Screen) => void;
  openSheet: (s: SheetId) => void;
  selectSpace: (id: number | null) => void;
  setReducedMotion: (v: boolean) => void;

  newOfflineGame: (configs: PlayerConfig[], settings: Partial<GameSettings>, seed?: number) => void;
  loadGameState: (s: GameState, opts?: { mode?: NetMode; isHost?: boolean; localPlayerId?: string | null }) => void;
  dispatch: (action: GameAction) => { error?: string };
  clearError: () => void;
  quitGame: () => void;
  pushEvent: (e: GameEvent) => void;
}

const MAX_FLOATS = 6;

function toneFor(e: GameEvent): 'gain' | 'loss' | null {
  if (e.type === 'cashChange') return (e.amount ?? 0) > 0 ? 'gain' : 'loss';
  if (e.type === 'goSalary' || e.type === 'freeParkingCollect') return 'gain';
  if (e.type === 'rentPaid') return 'loss';
  return null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  mode: 'offline',
  isHost: true,
  localPlayerId: null,
  actionError: null,
  fx: [],
  floats: [],
  lastDice: null,
  moveAnim: null,
  screen: 'splash',
  sheet: null,
  selectedSpaceId: null,
  pendingSpaceView: null,
  reducedMotion: false,
  fxSeq: 0,
  botTimer: null,

  setScreen: (s) => set({ screen: s }),
  openSheet: (s) => set({ sheet: s }),
  selectSpace: (id) => set({ selectedSpaceId: id, pendingSpaceView: id }),
  setReducedMotion: (v) => set({ reducedMotion: v }),

  newOfflineGame: (configs, settings, seed = Math.floor(Math.random() * 1e9)) => {
    const state = createGame(`g-${seed}`, seed, configs, settings);
    const r = applyAction(state, { type: 'START_GAME' });
    set({
      state: r.state,
      mode: 'offline',
      isHost: true,
      localPlayerId: 'p0',
      screen: 'game',
      sheet: null,
      fx: [],
      floats: [],
      actionError: null,
    });
  },

  loadGameState: (s, opts = {}) => {
    set({
      state: s,
      mode: opts.mode ?? get().mode,
      isHost: opts.isHost ?? get().isHost,
      localPlayerId: opts.localPlayerId ?? get().localPlayerId,
      screen: 'game',
      sheet: null,
    });
  },

  dispatch: (action) => {
    const { state, isHost, mode } = get();
    if (!state) return { error: 'no-game' };

    // Guests in multiplayer send their action to the host instead of applying.
    if (!isHost && mode !== 'offline') {
      // Adapter integration handled in network layer via window event hook.
      window.dispatchEvent(new CustomEvent('ec-send-action', { detail: action }));
      return {};
    }

    const result = applyAction(state, action);
    if (result.error) {
      set({ actionError: result.error });
      setTimeout(() => set({ actionError: null }), 2200);
      return { error: result.error };
    }

    // process events → fx
    const nextFx: FxItem[] = [];
    const floats: FloatText[] = [];
    let fxSeq = get().fxSeq;
    let lastDice = get().lastDice;
    let moveAnim = get().moveAnim;

    for (const e of result.events) {
      fxSeq += 1;
      nextFx.push({ id: fxSeq, event: e });
      const t = toneFor(e);
      if (t) {
        floats.push({
          id: fxSeq,
          playerId: e.playerId,
          spaceId: e.spaceId,
          text: `${t === 'gain' ? '+' : '−'}$${Math.abs(e.amount ?? 0)}`,
          tone: t,
        });
      }
      if (e.type === 'diceRolled' && e.dice) {
        lastDice = { d1: e.dice.d1, d2: e.dice.d2, key: fxSeq };
      }
      if (e.type === 'pawnMove') {
        const from = state.players.find((p) => p.id === e.playerId)?.position ?? 0;
        const to = e.spaceId ?? from;
        const path: number[] = [];
        let cur = from;
        const total = e.dice?.total ?? 0;
        for (let i = 0; i < total; i++) {
          cur = (cur + 1) % 40;
          path.push(cur);
        }
        if (path.length === 0) path.push(to);
        moveAnim = { playerId: e.playerId!, path, key: fxSeq };
      }
      if (e.type === 'pawnTeleport' && e.playerId) {
        moveAnim = { playerId: e.playerId, path: [e.spaceId ?? 0], key: fxSeq };
      }
    }

    const trimmed = floats.slice(-MAX_FLOATS);
    set({
      state: result.state,
      fx: [...get().fx.slice(-40), ...nextFx],
      floats: [...get().floats, ...trimmed].slice(-MAX_FLOATS),
      fxSeq,
      lastDice,
      moveAnim,
    });

    // Host broadcast hook (multiplayer) — network layer listens.
    if (mode !== 'offline') {
      window.dispatchEvent(new CustomEvent('ec-state-updated', { detail: result.state }));
    }
    return {};
  },

  clearError: () => set({ actionError: null }),

  quitGame: () => {
    const { botTimer } = get();
    if (botTimer) clearTimeout(botTimer);
    set({ state: null, screen: 'menu', sheet: null, fx: [], floats: [], botTimer: null });
  },

  pushEvent: (e) => {
    const { fxSeq, fx } = get();
    set({ fx: [...fx.slice(-40), { id: fxSeq + 1, event: e }], fxSeq: fxSeq + 1 });
  },
}));

// ─── Bot loop ───────────────────────────────────────────────────────────────

let botLoopRunning = false;

/** Drives bot decisions with human-like delays. Call after any state change. */
export function scheduleBots(): void {
  const store = useGameStore.getState();
  const { state, isHost, mode, botTimer } = store;
  if (!state || !isHost) return;
  if (mode === 'offline' || isHost) {
    if (state.phase === 'game-over') return;
    const pend = pendingBotIds(state);
    if (pend.length === 0) return;

    const bot = state.players.find((p) => p.id === pend[0]);
    const difficulty = bot?.botDifficulty ?? 'normal';
    const base = difficulty === 'hard' ? 700 : difficulty === 'normal' ? 950 : 800;
    const delay = botLoopRunning ? base : 400;
    botLoopRunning = true;

    if (botTimer) clearTimeout(botTimer);
    const timer = setTimeout(() => {
      const s = useGameStore.getState();
      if (!s.state || s.state.phase === 'game-over') { botLoopRunning = false; return; }
      const next = pendingBotIds(s.state)[0];
      if (!next) { botLoopRunning = false; return; }
      const action = decideBotAction(s.state, next);
      botLoopRunning = false;
      if (action) {
        s.dispatch(action);
        scheduleBots();
      }
    }, delay + Math.random() * 450);
    useGameStore.setState({ botTimer: timer });
  }
}

// Dev/QA debugging hook (harmless in production).
if (typeof window !== 'undefined') {
  (window as unknown as { __ecStore?: typeof useGameStore }).__ecStore = useGameStore;
}

// Auto-schedule on state changes.
useGameStore.subscribe((s, prev) => {
  if (s.state !== prev.state && s.state) {
    scheduleBots();
    // auto-save every state change (throttled per turn by saveEngine)
    if (s.mode === 'offline') {
      void import('../save/saveEngine').then(({ autoSave }) =>
        autoSave(s.state!, s.localPlayerId, s.mode)
      );
    }
  }
});

/** Emotion derived for HUD display from the latest fx stream. */
export function currentEmotion(state: GameState | null, playerId: string, defaultEmotion: Emotion = 'idle'): Emotion {
  if (!state) return 'idle';
  if (state.phase === 'game-over') {
    if (state.winnerId === playerId) return 'winner';
    const p = state.players.find((pl) => pl.id === playerId);
    if (p?.bankrupt) return 'bankrupt';
    return 'sad';
  }
  if (state.debt?.playerId === playerId) return 'sad';
  const fx = useGameStore.getState().fx;
  for (let i = fx.length - 1; i >= Math.max(0, fx.length - 12); i--) {
    const e = fx[i].event;
    if (e.playerId === playerId && e.type === 'emotion') {
      return (e.emotion as Emotion) ?? 'idle';
    }
  }
  const p = state.players.find((pl) => pl.id === playerId);
  if (p?.inJail) return 'jailed';
  return defaultEmotion;
}
