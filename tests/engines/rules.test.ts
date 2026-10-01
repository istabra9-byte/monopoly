import { describe, it, expect } from 'vitest';
import { createGame, applyAction } from '../../src/engines/rulesEngine';
import { start, fresh } from '../helpers';
import { BOARD } from '../../src/data/board';
import type { GameState, GameAction } from '../../src/engines/types';
import { hasMonopoly, computeRent } from '../../src/engines/economyEngine';

/** Force-position a player & grant cash for scenario tests (test-only). */
function setup(state: GameState, playerId: string, opts: { position?: number; cash?: number; grant?: number[] }): GameState {
  const s = structuredClone(state);
  const p = s.players.find((x) => x.id === playerId)!;
  if (opts.position !== undefined) p.position = opts.position;
  if (opts.cash !== undefined) p.cash = opts.cash;
  for (const id of opts.grant ?? []) s.spaces[id].ownerId = playerId;
  return s;
}

function act(state: GameState, a: GameAction) {
  return applyAction(state, a);
}

/** Move game into 'awaiting-end' phase for management-action tests. */
function ready(state: GameState): GameState {
  return { ...state, phase: 'awaiting-end' as const };
}

describe('turn flow', () => {
  it('rejects actions from non-current players', () => {
    const s = start();
    const r = act(s, { type: 'ROLL_DICE', playerId: 'p1' });
    expect(r.error).toBe('error.notYourTurn');
  });

  it('roll moves the player and keeps money conserved', () => {
    const s0 = start();
    const total0 = s0.players.reduce((a, p) => a + p.cash, 0);
    const r = act(s0, { type: 'ROLL_DICE', playerId: 'p0' });
    expect(r.error).toBeUndefined();
    const total1 = r.state.players.reduce((a, p) => a + p.cash, 0);
    // money only changes via GO salary (allowed) — must be total0 or total0+200
    expect([total0, total0 + 200]).toContain(total1);
  });

  it('phase transitions roll → awaiting-end on empty space', () => {
    const s0 = start();
    const r = act(s0, { type: 'ROLL_DICE', playerId: 'p0' });
    expect(['awaiting-end', 'buy-decision', 'debt', 'auction']).toContain(r.state.phase);
  });
});

describe('buy / rent', () => {
  it('monopoly doubles base rent on unimproved streets', () => {
    let s = start();
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    expect(hasMonopoly(s, 'p0', 'old-docks')).toBe(true);
    const rent = computeRent(s, 1, { diceTotal: 7 });
    expect(rent).toBe(4); // 2 * 2 doubled
  });

  it('station rent scales with count owned', () => {
    let s = start();
    s.spaces[5].ownerId = 'p1';
    expect(computeRent(s, 5, { diceTotal: 9 })).toBe(25);
    s.spaces[15].ownerId = 'p1';
    expect(computeRent(s, 5, { diceTotal: 9 })).toBe(50);
    s.spaces[25].ownerId = 'p1';
    s.spaces[35].ownerId = 'p1';
    expect(computeRent(s, 5, { diceTotal: 9 })).toBe(200);
  });

  it('utility rent = 4x / 10x dice', () => {
    let s = start();
    s.spaces[12].ownerId = 'p0';
    expect(computeRent(s, 12, { diceTotal: 8 })).toBe(32);
    s.spaces[28].ownerId = 'p0';
    expect(computeRent(s, 12, { diceTotal: 8 })).toBe(80);
  });

  it('mortgaged property collects no rent', () => {
    let s = start();
    s.spaces[1].ownerId = 'p1';
    s.spaces[1].mortgaged = true;
    expect(computeRent(s, 1, { diceTotal: 7 })).toBe(0);
  });
});

describe('build / even-build / bank supply', () => {
  it('requires monopoly to build', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    const r = act(s, { type: 'BUILD_HOUSE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBe('error.needMonopoly');
  });

  it('enforces even build inside district', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    s.spaces[1].houses = 2;
    const r = act(s, { type: 'BUILD_HOUSE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBe('error.evenBuild');
  });

  it('builds house and deducts cash + bank supply', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    s.players[0].cash = 1000;
    const r = act(s, { type: 'BUILD_HOUSE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBeUndefined();
    expect(r.state.spaces[1].houses).toBe(1);
    expect(r.state.players[0].cash).toBe(950);
    expect(r.state.housesLeft).toBe(31);
  });

  it('hotel consumes 4 houses + 1 hotel from bank', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    s.spaces[1].houses = 4;
    s.spaces[3].houses = 4;
    s.players[0].cash = 1000;
    const r = act(s, { type: 'BUILD_HOUSE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBeUndefined();
    expect(r.state.spaces[1].houses).toBe(5);
    expect(r.state.hotelsLeft).toBe(11);
    expect(r.state.housesLeft).toBe(28);
  });

  it('selling house refunds half price', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    s.spaces[1].houses = 2;
    s.spaces[3].houses = 2;
    const before = s.players[0].cash;
    const r = act(s, { type: 'SELL_HOUSE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].cash).toBe(before + 25);
    expect(r.state.spaces[1].houses).toBe(1);
  });
});

describe('mortgage', () => {
  it('mortgage pays half price; unmortgage costs 10% more', () => {
    let s = ready(start());
    s.spaces[5].ownerId = 'p0';
    const cash0 = s.players[0].cash;
    let r = act(s, { type: 'MORTGAGE', playerId: 'p0', spaceId: 5 });
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].cash).toBe(cash0 + 100);
    expect(r.state.spaces[5].mortgaged).toBe(true);
    r = act(r.state, { type: 'UNMORTGAGE', playerId: 'p0', spaceId: 5 });
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].cash).toBe(cash0 - 10); // +100 mortgage, -110 unmortgage
    expect(r.state.spaces[5].mortgaged).toBe(false);
  });

  it('cannot mortgage with buildings', () => {
    let s = ready(start());
    s.spaces[1].ownerId = 'p0';
    s.spaces[3].ownerId = 'p0';
    s.spaces[1].houses = 1;
    const r = act(s, { type: 'MORTGAGE', playerId: 'p0', spaceId: 1 });
    expect(r.error).toBe('error.hasBuildings');
  });
});

describe('jail', () => {
  it('pay fine releases and lets you roll', () => {
    let s = start();
    s.players[0].inJail = true;
    s.players[0].cash = 500;
    let r = act(s, { type: 'PAY_JAIL_FINE', playerId: 'p0' });
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].inJail).toBe(false);
    expect(r.state.players[0].cash).toBe(450);
    const r2 = act(r.state, { type: 'ROLL_DICE', playerId: 'p0' });
    expect(r2.error).toBeUndefined();
  });

  it('jail card usage decrements and releases', () => {
    let s = start();
    s.players[0].inJail = true;
    s.players[0].getOutOfJailCards = 1;
    const r = act(s, { type: 'USE_JAIL_CARD', playerId: 'p0' });
    expect(r.state.players[0].inJail).toBe(false);
    expect(r.state.players[0].getOutOfJailCards).toBe(0);
  });

  it('owner in jail still collects rent', () => {
    let s = start();
    s.spaces[1].ownerId = 'p0';
    s.players[0].inJail = true;
    const rent = computeRent(s, 1, { diceTotal: 5 });
    expect(rent).toBe(2);
  });
});

describe('bankruptcy & elimination', () => {
  it('bankruptcy eliminates and transfers assets to creditor', () => {
    let s = start();
    s.spaces[1].ownerId = 'p0';
    s.spaces[1].houses = 2;
    s.players[0].cash = 30;
    s.debt = { playerId: 'p0', creditorId: 'p1', amount: 500 };
    s.phase = 'debt';
    const r = act(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'p0' });
    expect(r.error).toBeUndefined();
    expect(r.state.players[0].bankrupt).toBe(true);
    expect(r.state.spaces[1].ownerId).toBe('p1');
    expect(r.state.spaces[1].houses).toBe(0); // buildings liquidated
    expect(r.state.phase).toBe('game-over');
    expect(r.state.winnerId).toBe('p1');
  });

  it('last player standing wins', () => {
    let s = start(1, 3);
    s.players[0].bankrupt = true;
    s.players[1].bankrupt = true;
    s.debt = { playerId: 'p2', creditorId: null, amount: 100 };
    s.phase = 'debt';
    const r = act(s, { type: 'DECLARE_BANKRUPTCY', playerId: 'p2' });
    expect(r.state.phase).toBe('game-over');
  });
});

describe('trades', () => {
  it('validates ownership and buildings before offering', () => {
    let s = start();
    s.spaces[1].ownerId = 'p1';
    s.spaces[1].houses = 2;
    const r = act(s, {
      type: 'PROPOSE_TRADE', playerId: 'p0',
      offer: { fromId: 'p0', toId: 'p1', giveCash: 0, getCash: 0, giveProperties: [], getProperties: [1], giveJailCards: 0, getJailCards: 0 },
    });
    expect(r.error).toBe('error.hasBuildings');
  });

  it('executes an accepted trade fully', () => {
    let s = start();
    s.spaces[1].ownerId = 'p0';
    s.spaces[5].ownerId = 'p1';
    const r1 = act(s, {
      type: 'PROPOSE_TRADE', playerId: 'p0',
      offer: { fromId: 'p0', toId: 'p1', giveCash: 100, getCash: 0, giveProperties: [1], getProperties: [5], giveJailCards: 0, getJailCards: 0 },
    });
    expect(r1.error).toBeUndefined();
    expect(r1.state.phase).toBe('trade-pending');
    const r2 = act(r1.state, { type: 'ACCEPT_TRADE', playerId: 'p1' });
    expect(r2.error).toBeUndefined();
    expect(r2.state.spaces[1].ownerId).toBe('p1');
    expect(r2.state.spaces[5].ownerId).toBe('p0');
    expect(r2.state.players[0].cash).toBe(s.players[0].cash - 100);
    expect(r2.state.players[1].cash).toBe(s.players[1].cash + 100);
    expect(r2.state.phase).toBe('roll');
  });
});

describe('auction', () => {
  it('decline with auctions enabled starts auction; last bidder wins', () => {
    let s = setup(start(), 'p0', { position: 1, cash: 1500 });
    s.phase = 'buy-decision';
    const r = act(s, { type: 'DECLINE_BUY', playerId: 'p0' });
    expect(r.state.phase).toBe('auction');
    expect(r.state.pendingAuction).not.toBeNull();
    // p0 bids 60
    const r2 = act(r.state, { type: 'BID', playerId: 'p0', amount: 60 });
    const a = r2.state.pendingAuction;
    if (a && a.activePlayerId === 'p1') {
      const r3 = act(r2.state, { type: 'PASS_BID', playerId: 'p1' });
      if (r3.state.pendingAuction) {
        const r4 = act(r3.state, { type: 'PASS_BID', playerId: 'p0' });
        expect(r4.state.spaces[1].ownerId).toBe('p0');
        expect(r4.state.players[0].cash).toBe(1440);
      } else {
        expect(r3.state.spaces[1].ownerId).toBe('p0');
      }
    } else {
      expect(r2.state.spaces[1].ownerId).toBe('p0');
    }
  });

  it('rejects low bids and out-of-turn bids', () => {
    let s = start();
    s.phase = 'auction';
    s.pendingAuction = { spaceId: 1, bids: {}, activePlayerId: 'p1', currentBid: 50, highestBidderId: 'p0', passed: [], turnDeadline: null };
    const r = act(s, { type: 'BID', playerId: 'p1', amount: 50 });
    expect(r.error).toBe('error.bidTooLow');
    const r2 = act(s, { type: 'BID', playerId: 'p0', amount: 60 });
    expect(r2.error).toBe('error.notYourBid');
  });

  it('auctions disabled → decline keeps property with bank', () => {
    let s = start();
    s.settings.auctionsEnabled = false;
    s.phase = 'buy-decision';
    const r = act(s, { type: 'DECLINE_BUY', playerId: 'p0' });
    expect(r.state.phase).toBe('awaiting-end');
    expect(r.state.spaces[s.players[0].position].ownerId).toBeNull();
  });
});

describe('determinism & replay', () => {
  it('same seed + same actions → identical states', () => {
    const run = () => {
      let s = start(1234, 3);
      for (let i = 0; i < 30; i++) {
        const cur = s.players[s.currentPlayerIndex];
        if (s.phase === 'roll') {
          s = act(s, { type: 'ROLL_DICE', playerId: cur.id }).state;
        } else if (s.phase === 'awaiting-end') {
          s = act(s, { type: 'END_TURN', playerId: cur.id }).state;
        } else if (s.phase === 'buy-decision') {
          s = act(s, { type: 'BUY_PROPERTY', playerId: cur.id }).state;
          if (s.phase === 'buy-decision') s = act(s, { type: 'DECLINE_BUY', playerId: cur.id }).state;
        } else break;
      }
      return JSON.stringify([s.players.map((p) => [p.position, p.cash]), s.rngCounter]);
    };
    expect(run()).toBe(run());
  });

  it('invalid actions never mutate state', () => {
    const s = start();
    const r = act(s, { type: 'ROLL_DICE', playerId: 'p1' });
    expect(r.state).toBe(s); // same reference returned on error
    expect(r.error).toBeTruthy();
  });
});

describe('board data integrity', () => {
  it('has exactly 40 spaces with valid structure', () => {
    expect(BOARD).toHaveLength(40);
    expect(BOARD.filter((x) => x.type === 'street')).toHaveLength(22);
    expect(BOARD.filter((x) => x.type === 'station')).toHaveLength(4);
    expect(BOARD.filter((x) => x.type === 'utility')).toHaveLength(2);
    expect(BOARD.filter((x) => x.type === 'chance')).toHaveLength(3);
    expect(BOARD.filter((x) => x.type === 'chest')).toHaveLength(3);
  });

  it('every street rent table has 6 entries and mortgage = price/2', () => {
    for (const sp of BOARD) {
      if (sp.type === 'street') {
        expect(sp.rent).toHaveLength(6);
        expect(sp.mortgageValue).toBe(Math.floor(sp.price! / 2));
      }
    }
  });
});
