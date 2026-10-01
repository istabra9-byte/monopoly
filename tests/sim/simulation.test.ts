import { describe, it, expect } from 'vitest';
import { createGame, applyAction } from '../../src/engines/rulesEngine';
import { decideBotAction, pendingBotIds } from '../../src/engines/aiEngine';
import type { GameState, GameAction, GamePhase } from '../../src/engines/types';

const GAME_COUNT = Number(process.env.SIM_GAMES ?? 1000);
const MAX_TURNS = 4000;

const DIFFS = ['easy', 'normal', 'hard'] as const;
const PERSONAS = ['aggressive', 'cautious', 'trader', 'balanced'] as const;

function newBotGame(seed: number, playerCount: number): GameState {
  const cfgs = Array.from({ length: playerCount }, (_, i) => ({
    name: `Bot${i}`,
    characterId: ['sailor', 'chef', 'pilot', 'detective', 'astronaut', 'artist'][i % 6],
    color: '#2E86AB',
    isBot: true,
    botDifficulty: DIFFS[(seed + i) % 3],
    botPersonality: PERSONAS[(seed * 7 + i * 3) % 4],
  }));
  const s = createGame(`sim-${seed}`, seed, cfgs, { auctionsEnabled: true, maxTurns: 500 });
  return applyAction(s, { type: 'START_GAME' }).state;
}

function checkInvariants(s: GameState, ctx: string): void {
  let cashSum = 0;
  for (const p of s.players) {
    expect(Number.isInteger(p.cash), `cash int ${ctx} ${p.id}`).toBe(true);
    expect(p.cash >= 0, `cash >= 0 ${ctx} ${p.id}: ${p.cash}`).toBe(true);
    expect(Number.isFinite(p.cash), `cash finite ${ctx}`).toBe(true);
    cashSum += p.cash;
  }
  expect(Number.isFinite(s.freeParkingPool), `pool finite ${ctx}`).toBe(true);
  expect(s.freeParkingPool >= 0, `pool >= 0 ${ctx}`).toBe(true);

  s.spaces.forEach((ss, i) => {
    if (ss.ownerId !== null) {
      const owner = s.players.find((p) => p.id === ss.ownerId);
      expect(owner, `owner exists ${ctx} space ${i}`).toBeTruthy();
      expect(owner!.bankrupt, `owner alive ${ctx} space ${i}`).toBe(false);
    }
    expect(ss.houses >= 0 && ss.houses <= 5, `houses range ${ctx} space ${i}`).toBe(true);
  });

  const validPhases: GamePhase[] = [
    'lobby', 'roll', 'moving', 'resolve', 'buy-decision', 'auction',
    'debt', 'awaiting-end', 'trade-pending', 'game-over',
  ];
  expect(validPhases, `phase valid ${ctx}: ${s.phase}`).toContain(s.phase);

  if (s.phase !== 'game-over') {
    const cur = s.players[s.currentPlayerIndex];
    expect(cur.bankrupt, `current player alive ${ctx}`).toBe(false);
  } else {
    expect(s.winnerId, `winner set ${ctx}`).toBeTruthy();
  }
  expect(cashSum).toBeLessThan(Number.MAX_SAFE_INTEGER / 2);
}

function driveGame(seed: number, playerCount: number): { turns: number; finished: boolean; actions: number } {
  let s = newBotGame(seed, playerCount);
  let turns = 0;
  let actions = 0;
  let nullStreak = 0;

  while (s.phase !== 'game-over' && turns < MAX_TURNS) {
    const before = s;
    let acted = false;

    const pend = pendingBotIds(s);
    for (const pid of pend) {
      const a = decideBotAction(s, pid);
      if (a) {
        const r = applyAction(s, a);
        if (r.error) {
          // Bots must never emit invalid actions — hard fail with context.
          throw new Error(`bot ${pid} invalid action ${JSON.stringify(a)}: ${r.error} (phase ${s.phase})`);
        }
        s = r.state;
        acted = true;
        nullStreak = 0;
        break; // re-evaluate after each action
      }
    }

    if (!acted) {
      // Fallback for phases the brain doesn't cover — advance safely.
      const cur = s.players[s.currentPlayerIndex];
      const fb: Record<string, GameAction | null> = {
        'roll': { type: 'ROLL_DICE', playerId: cur.id },
        'awaiting-end': { type: 'END_TURN', playerId: cur.id },
        'buy-decision': { type: 'DECLINE_BUY', playerId: cur.id },
      };
      const action = fb[s.phase] ?? null;
      if (!action) {
        nullStreak++;
        if (nullStreak > 3) throw new Error(`stuck in phase ${s.phase} at turn ${turns}`);
        s = structuredClone(s);
      } else {
        const r = applyAction(s, action);
        if (r.error) throw new Error(`fallback invalid: ${r.error} phase ${s.phase}`);
        s = r.state;
        nullStreak = 0;
      }
    }

    checkInvariants(s, `seed ${seed} turn ${turns} act ${actions}`);
    actions++;
    if (s.turn !== before.turn) turns++;
    if (actions > MAX_TURNS * 8) throw new Error(`action runaway seed ${seed}`);
  }

  return { turns: s.turn, finished: s.phase === 'game-over', actions };
}

describe('headless simulation — bot vs bot', () => {
  it(`runs ${GAME_COUNT} games with no deadlocks, crashes or invalid states`, () => {
    let finished = 0;
    const turnCounts: number[] = [];
    for (let seed = 1; seed <= GAME_COUNT; seed++) {
      const players = 2 + (seed % 5); // 2..6 players
      const res = driveGame(seed, players);
      if (res.finished) finished++;
      turnCounts.push(res.turns);
    }
    const finishRate = finished / GAME_COUNT;
    // Games may legitimately run long; we require a healthy finish rate.
    expect(finishRate).toBeGreaterThan(0.9);
    const avg = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length;

    console.log(`sim: ${finished}/${GAME_COUNT} finished, avg ${avg.toFixed(0)} turns`);
  }, 900_000);

  it('money and ownership invariants hold across a quick stress batch', () => {
    for (let seed = 9001; seed <= 9050; seed++) {
      driveGame(seed, 6);
    }
  }, 300_000);
});
