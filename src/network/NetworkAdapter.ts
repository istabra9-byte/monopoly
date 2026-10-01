/**
 * NetworkAdapter — transport abstraction. The UI and engines never know
 * which implementation is active. Host-authoritative model: guests send
 * actions; the host validates, applies, and broadcasts state snapshots.
 */
import type { GameState, GameAction } from '../engines/types';

export interface PlayerProfile {
  name: string;
  characterId: string;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'normal' | 'hard';
}

export interface RoomInfo {
  code: string;
  hostId: string;
  players: Array<{ uid: string; profile: PlayerProfile; connected: boolean; ready: boolean }>;
  status: 'lobby' | 'playing' | 'finished';
  maxPlayers: number;
  settings?: Record<string, unknown>;
}

export interface NetworkAdapter {
  readonly kind: 'local' | 'firebase' | 'lan';
  /** Set up transport; resolve when ready to create/join. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Host only: create a room and return its code. */
  createRoom(profile: PlayerProfile, maxPlayers?: number): Promise<string>;
  /** Guest: join by code. */
  joinRoom(code: string, profile: PlayerProfile): Promise<void>;
  /** Guest only: send an action to the host. */
  sendAction(action: GameAction): void;
  /** Host only: publish a state snapshot. */
  publishState(state: GameState): void;
  /** Host only: mark the game started. */
  markStarted(): Promise<void>;
  /** Latency probe in ms (best effort). */
  getLatency(): number;

  onState(cb: (state: GameState) => void): void;
  onRoomInfo(cb: (info: RoomInfo) => void): void;
  onPlayerJoin(cb: (uid: string, profile: PlayerProfile) => void): void;
  onPlayerLeave(cb: (uid: string) => void): void;
  onError(cb: (message: string) => void): void;
  onChat(cb: (msg: { uid: string; name: string; text: string; ts: number }) => void): void;
  sendChat(text: string): void;
}

/** Shared helper: 6-char room codes. */
export function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
}
