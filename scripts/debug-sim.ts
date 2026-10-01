/* Debug: run a few sim games, print progress + where they stall. */
import { createGame, applyAction } from '../src/engines/rulesEngine';
import { decideBotAction, pendingBotIds } from '../src/engines/aiEngine';
import type { GameState } from '../src/engines/types';

const DIFFS = ['easy', 'normal', 'hard'] as const;
const PERSONAS = ['aggressive', 'cautious', 'trader', 'balanced'] as const;

function newBotGame(seed: number, n: number): GameState {
  const cfgs = Array.from({ length: n }, (_, i) => ({
    name: `Bot${i}`, characterId: 'sailor', color: '#2E86AB', isBot: true,
    botDifficulty: DIFFS[(seed + i) % 3], botPersonality: PERSONAS[(seed * 7 + i * 3) % 4],
  }));
  return applyAction(createGame(`s${seed}`, seed, cfgs, { auctionsEnabled: true }), { type: 'START_GAME' }).state;
}

for (const seed of [1, 2, 3, 4, 5, 6]) {
  let s = newBotGame(seed, 2 + (seed % 5));
  let actions = 0, stallTurn = 0;
  const phaseCount: Record<string, number> = {};
  while (s.phase !== 'game-over' && actions < 60000) {
    let acted = false;
    for (const pid of pendingBotIds(s)) {
      const a = decideBotAction(s, pid);
      if (a) {
        const r = applyAction(s, a);
        if (r.error) { console.log(`seed ${seed} INVALID ${JSON.stringify(a)} ${r.error} phase ${s.phase}`); process.exit(1); }
        s = r.state; acted = true; break;
      }
    }
    if (!acted) {
      const cur = s.players[s.currentPlayerIndex];
      const fb: Record<string, any> = {
        roll: { type: 'ROLL_DICE', playerId: cur.id },
        'awaiting-end': { type: 'END_TURN', playerId: cur.id },
        'buy-decision': { type: 'DECLINE_BUY', playerId: cur.id },
      };
      const act = fb[s.phase];
      if (!act) { stallTurn = s.turn; break; }
      s = applyAction(s, act).state;
    }
    phaseCount[s.phase] = (phaseCount[s.phase] ?? 0) + 1;
    actions++;
    if (actions % 20000 === 0) {
      const alive = s.players.filter((p) => !p.bankrupt).length;
      console.log(`seed ${seed} act ${actions} turn ${s.turn} phase ${s.phase} alive ${alive} cash ${s.players.map((p) => p.cash).join(',')}`);
    }
  }
  const alive = s.players.filter((p) => !p.bankrupt).length;
  console.log(`seed ${seed}: ${s.phase} after ${actions} actions, turn ${s.turn}, alive ${alive}, stallTurn ${stallTurn}, phases ${JSON.stringify(phaseCount)}`);
}
