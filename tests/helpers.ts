import { describe, it, expect } from 'vitest';
import { createGame, applyAction, type PlayerConfig } from '../src/engines/rulesEngine';
import { DEFAULT_SETTINGS } from '../src/engines/types';
import type { GameState } from '../src/engines/types';

export const CFG: PlayerConfig[] = [
  { name: 'Alice', characterId: 'sailor', color: '#2E86AB', isBot: false },
  { name: 'Bob', characterId: 'chef', color: '#E4572E', isBot: false },
];

export function fresh(seed = 42, n = 2, cfg: Partial<PlayerConfig>[] = []): GameState {
  const configs = Array.from({ length: n }, (_, i) => ({
    name: `P${i}`, characterId: 'sailor', color: '#2E86AB', isBot: false,
    ...cfg[i],
  }));
  return createGame('test', seed, configs as PlayerConfig[], {});
}

export function start(seed = 42, n = 2): GameState {
  return applyAction(fresh(seed, n), { type: 'START_GAME' }).state;
}

export { describe, it, expect, DEFAULT_SETTINGS };
