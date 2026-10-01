'use client';

/**
 * SaveEngine — IndexedDB persistence. Auto-save every turn, three manual
 * slots, JSON export/import. Zero dependencies (raw IDB wrapper).
 */
import type { GameState } from '../engines/types';

const DB_NAME = 'empire-city';
const DB_VERSION = 1;
const STORE = 'saves';
const AUTO_KEY = 'auto';
const SLOT_PREFIX = 'slot-';

export interface SaveRecord {
  key: string;
  savedAt: number;
  state: GameState;
  mode?: 'offline' | 'lan' | 'online';
  localPlayerId?: string | null;
  label?: string;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function put(record: SaveRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  });
}

async function get(key: string): Promise<SaveRecord | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve((req.result as SaveRecord) ?? null); };
    req.onerror = () => { db.close(); resolve(null); };
  });
}

async function listAll(): Promise<SaveRecord[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => { db.close(); resolve((req.result as SaveRecord[]) ?? []); };
    req.onerror = () => { db.close(); resolve([]); };
  });
}

async function del(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  });
}

export async function autoSave(state: GameState, localPlayerId: string | null, mode: 'offline' | 'lan' | 'online' = 'offline'): Promise<void> {
  if (state.phase === 'game-over') return;
  await put({ key: AUTO_KEY, savedAt: Date.now(), state, localPlayerId, mode });
}

export async function saveToSlot(slot: 1 | 2 | 3, state: GameState, localPlayerId: string | null): Promise<void> {
  await put({
    key: `${SLOT_PREFIX}${slot}`, savedAt: Date.now(), state, localPlayerId,
    label: `Turn ${state.turn} · ${state.players.length}p`,
  });
}

export async function loadLatestSave(): Promise<SaveRecord | null> {
  const rec = await get(AUTO_KEY);
  return rec;
}

export async function loadSlot(slot: 1 | 2 | 3): Promise<SaveRecord | null> {
  return get(`${SLOT_PREFIX}${slot}`);
}

export async function deleteSave(key: string): Promise<void> {
  return del(key);
}

export async function listSaves(): Promise<SaveRecord[]> {
  const all = await listAll();
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export function exportSave(record: SaveRecord): string {
  return JSON.stringify({ __empireCitySave: 1, ...record }, null, 2);
}

export function parseImport(raw: string): SaveRecord | null {
  try {
    const obj = JSON.parse(raw) as SaveRecord & { __empireCitySave?: number };
    if (obj.__empireCitySave !== 1 || !obj.state || !Array.isArray(obj.state.players)) return null;
    return obj;
  } catch {
    return null;
  }
}

export async function importSave(raw: string): Promise<boolean> {
  const rec = parseImport(raw);
  if (!rec) return false;
  await put({ ...rec, key: AUTO_KEY, savedAt: Date.now() });
  return true;
}
