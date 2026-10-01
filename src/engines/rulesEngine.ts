/**
 * RulesEngine — deterministic, validated state machine for Empire City.
 *
 *   state' = applyAction(state, action).state
 *
 * Pure (no I/O, no DOM, no React). Every action is validated against the
 * current phase and acting player; invalid actions are rejected with a
 * machine-readable error key and NO state change. All randomness flows from
 * the seeded RNG stream tracked in state (rngCounter) so any state + action
 * log replays identically.
 */
import type {
  GameState, GameAction, GameEvent, ApplyResult, Player, GameSettings,
  BotDifficulty, BotPersonality, DiceRoll, EngineOut, GamePhase,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { BOARD, CARDS, CARDS_BY_ID } from '../data/board';
import { RngState, rollDie, seededShuffle } from './rng';
import {
  playerById, activePlayers, payMoney, payTax, collectFromBank,
  buildHouse, sellHouse, mortgage, unmortgage, trySettleDebt,
  settleBankruptcy, computeRent, pushLog, netWorth,
} from './economyEngine';
import { drawCard, takeTop, returnCard, applyCardEffect } from './cardEngine';
import { startAuction, advanceAuction, settleAuction, validateBid, auctionActiveOrder } from './auctionEngine';
import { validateOffer, executeTrade, normalizeOffer } from './tradeEngine';

// ─── Game creation ──────────────────────────────────────────────────────────

export interface PlayerConfig {
  name: string;
  characterId: string;
  color: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  botPersonality?: BotPersonality;
  uid?: string;
}

export function createGame(
  id: string,
  seed: number,
  playerConfigs: PlayerConfig[],
  settings?: Partial<GameSettings>
): GameState {
  const players: Player[] = playerConfigs.map((c, i) => ({
    id: `p${i}`,
    name: c.name,
    characterId: c.characterId,
    color: c.color,
    isBot: c.isBot,
    botDifficulty: c.botDifficulty,
    botPersonality: c.botPersonality ?? 'balanced',
    uid: c.uid,
    cash: 0,
    position: 0,
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    bankrupt: false,
    connected: true,
  }));

  const full: GameSettings = { ...DEFAULT_SETTINGS, ...settings };
  const rs: RngState = { seed, counter: 0 };

  const state: GameState = {
    id,
    seed,
    rngCounter: 0,
    turn: 0,
    players,
    currentPlayerIndex: 0,
    phase: 'lobby',
    spaces: BOARD.map(() => ({ ownerId: null, houses: 0, mortgaged: false })),
    chanceDeck: [],
    chestDeck: [],
    doublesCount: 0,
    dice: null,
    pendingAuction: null,
    pendingTrade: null,
    debt: null,
    freeParkingPool: 0,
    log: [],
    logSeq: 0,
    settings: full,
    stats: {
      rentCollected: {}, rentPaid: {}, propertiesBought: {},
      biggestDeal: null, netWorthHistory: [],
    },
    winnerId: null,
    housesLeft: full.maxHouses,
    hotelsLeft: full.maxHotels,
    lastCard: null,
  };

  state.chanceDeck = seededShuffle(CARDS.filter((c) => c.deck === 'chance').map((c) => c.id), rs);
  state.chestDeck = seededShuffle(CARDS.filter((c) => c.deck === 'chest').map((c) => c.id), rs);
  state.rngCounter = rs.counter;
  players.forEach((p) => { p.cash = full.startingCash; });
  return state;
}

// ─── Deterministic helper streams ───────────────────────────────────────────

function rngIntStream(state: GameState): (max: number) => number {
  const rs = (): RngState => ({ seed: state.seed, counter: state.rngCounter++ });
  let guard = 0;
  return (max: number) => {
    if (guard++ > 10000) throw new Error('rng overflow');
    const r = rollDie(rs());
    return (r * 7919 + state.rngCounter) % Math.max(1, max);
  };
}

// ─── Movement & resolution ──────────────────────────────────────────────────

function emitGoSalary(state: GameState, playerId: string, out: EngineOut, doubled: boolean): void {
  const amount = state.settings.goSalary * (doubled && state.settings.doubleSalaryOnGo ? 2 : 1);
  const p = playerById(state, playerId);
  if (!p) return;
  p.cash += amount;
  out.events.push({ type: 'goSalary', playerId, amount });
  pushLog(state, playerId, 'log.goSalary', { amount });
}

/** Move forward N steps (dice), collecting GO salary when passing GO. */
function moveForward(state: GameState, playerId: string, steps: number, out: EngineOut): void {
  const p = playerById(state, playerId)!;
  const target = (p.position + steps) % 40;
  const passedGo = p.position + steps >= 40;
  p.position = target;
  out.events.push({ type: 'pawnMove', playerId, spaceId: target, dice: { d1: 0, d2: 0, isDouble: false, total: steps } });
  if (passedGo) {
    emitGoSalary(state, playerId, out, false);
    out.events.push({ type: 'passGo', playerId });
  }
}

/** Teleport to a space (cards / jail), optionally paying GO salary. */
function moveTo(state: GameState, playerId: string, target: number, collectSalary: boolean, out: EngineOut): void {
  const p = playerById(state, playerId)!;
  const passedGo = target < p.position; // moving forward around the bend
  p.position = target;
  out.events.push({ type: 'pawnTeleport', playerId, spaceId: target });
  if (collectSalary) {
    emitGoSalary(state, playerId, out, false);
    out.events.push({ type: 'passGo', playerId });
  } else if (passedGo && target !== 0) {
    // Card-driven advance past GO still collects salary (classic rule).
    emitGoSalary(state, playerId, out, false);
    out.events.push({ type: 'passGo', playerId });
  }
}

function sendToJail(state: GameState, playerId: string, out: EngineOut): void {
  const p = playerById(state, playerId)!;
  p.position = 10;
  p.inJail = true;
  p.jailTurns = 0;
  state.doublesCount = 0;
  out.events.push({ type: 'jailEnter', playerId, spaceId: 10 });
  pushLog(state, playerId, 'log.jailEnter');
  out.events.push({ type: 'emotion', playerId, emotion: 'angry' });
}

type LandResult = 'none' | 'buy' | 'debt' | 'jail' | 'end';

/**
 * Resolve whatever space the player stands on. May recurse for card chains.
 * Mutates phase on: buy-decision / auction / debt / game-over.
 */
function resolveLanding(
  state: GameState, playerId: string,
  diceTotal: number | null,
  out: EngineOut,
  opts: { stationDouble?: boolean; utility10x?: boolean; utilityDice?: number; depth?: number } = {}
): LandResult {
  const depth = opts.depth ?? 0;
  const p = playerById(state, playerId)!;
  const spaceId = p.position;
  const data = BOARD[spaceId];

  switch (data.type) {
    case 'go':
      emitGoSalary(state, playerId, out, true); // landed directly on GO
      out.events.push({ type: 'passGo', playerId });
      return 'end';

    case 'street':
    case 'station':
    case 'utility': {
      const ss = state.spaces[spaceId];
      if (!ss.ownerId) {
        state.phase = 'buy-decision';
        out.events.push({ type: 'pawnTeleport', playerId, spaceId });
        return 'buy';
      }
      if (ss.ownerId === playerId || ss.mortgaged) return 'end';
      const rent = computeRent(state, spaceId, {
        diceTotal: opts.utilityDice ?? diceTotal,
        forcedMultiplier10x: opts.utility10x,
        payDoubleStation: opts.stationDouble,
      });
      const owner = playerById(state, ss.ownerId)!;
      pushLog(state, playerId, 'log.rentPaid', { space: data.name, amount: rent, owner: owner.name });
      out.events.push({ type: 'rentPaid', playerId, spaceId, amount: rent, meta: { ownerId: owner.id } });
      state.stats.rentCollected[owner.id] = (state.stats.rentCollected[owner.id] ?? 0) + rent;
      state.stats.rentPaid[playerId] = (state.stats.rentPaid[playerId] ?? 0) + rent;
      out.events.push({ type: 'emotion', playerId, emotion: 'sad' });
      out.events.push({ type: 'emotion', playerId: owner.id, emotion: 'happy' });
      const ok = payMoney(state, playerId, owner.id, rent, out);
      if (!ok) return 'debt';
      return 'end';
    }

    case 'tax': {
      const amount = data.taxAmount ?? 0;
      pushLog(state, playerId, 'log.taxDue', { space: data.name, amount });
      const ok = payTax(state, playerId, amount, out);
      if (!ok) return 'debt';
      return 'end';
    }

    case 'gotojail':
      sendToJail(state, playerId, out);
      return 'end';

    case 'freeparking': {
      if (state.settings.freeParkingJackpot && state.freeParkingPool > 0) {
        const amount = state.freeParkingPool;
        state.freeParkingPool = 0;
        collectFromBank(state, playerId, 0, out); // no-op guard
        p.cash += 0;
        const pp = playerById(state, playerId)!;
        pp.cash += amount;
        out.events.push({ type: 'freeParkingCollect', playerId, amount });
        pushLog(state, playerId, 'log.freeParking', { amount });
      }
      return 'end';
    }

    case 'chance':
    case 'chest': {
      if (depth > 3) return 'end';
      const deck = data.type === 'chance' ? 'chance' : 'chest';
      const card = drawCard(state, deck);
      if (!card) return 'end';
      takeTop(state, deck);
      state.lastCard = { cardId: card.id, deck };
      out.events.push({ type: 'cardDrawn', playerId, cardId: card.id, meta: { deck, deep: depth > 0 } });
      pushLog(state, playerId, card.titleKey);

      let followup: LandResult = 'end';
      const cardOut: EngineOut = { events: out.events, logs: [] };
      const result = applyCardEffect(
        state, p, card, cardOut,
        // movePlayerTo
        (s, pid, target, collectSalary, o) => {
          const sp = BOARD[target].type;
          moveTo(s, pid, target, collectSalary, o as never);
          if (target === 0) return 'none';
          if (sp === 'chance' || sp === 'chest') return 'draw';
          return 'none';
        },
        // resolveLanding callback (chained effects: rent on moved-to space etc.)
        (s, pl, dt, o2) => {
          const r = resolveLanding(s, pl.id, dt, out, { ...o2, depth: depth + 1 });
          return r === 'end' || r === 'jail' ? 'none' : r;
        },
        // rng int for the utility 10x roll — uses the seeded stream
        (() => {
          const g = rngIntStream(state);
          return () => {
            const d1 = g(6) + 1, d2 = g(6) + 1;
            out.events.push({ type: 'diceRolled', playerId, dice: { d1, d2, isDouble: d1 === d2, total: d1 + d2 }, meta: { utility: true } });
            return d1 + d2;
          };
        })()
      );

      // card return handling
      out.logs.push(...cardOut.logs);
      if (card.effect.kind !== 'jailFree') returnCard(state, deck, card.id);

      if (state.phase === 'debt') return 'debt';
      if (result === 'buy') return 'buy';
      if (result === 'draw') {
        followup = resolveLanding(state, playerId, diceTotal, out, { depth: depth + 1 });
      }
      if (result === 'gotojail') return 'end';
      return followup === 'buy' ? 'buy' : 'end';
    }

    case 'jail':
    default:
      return 'end';
  }
}

// ─── Turn helpers ───────────────────────────────────────────────────────────

function nextActiveIndex(state: GameState, from: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!state.players[idx].bankrupt) return idx;
  }
  return from;
}

function beginTurn(state: GameState, out: EngineOut): void {
  const p = state.players[state.currentPlayerIndex];
  state.phase = 'roll';
  state.doublesCount = 0;
  state.dice = null;
  out.events.push({ type: 'turnStart', playerId: p.id, meta: { turn: state.turn } });
}

function endTurn(state: GameState, out: EngineOut): void {
  const p = state.players[state.currentPlayerIndex];
  out.events.push({ type: 'turnEnd', playerId: p.id });

  // net-worth history once per full cycle (record on the turn owner's end)
  const values: Record<string, number> = {};
  for (const pl of state.players) values[pl.id] = pl.bankrupt ? 0 : netWorth(state, pl.id);
  const hist = state.stats.netWorthHistory;
  if (hist.length === 0 || hist[hist.length - 1].turn !== state.turn) {
    hist.push({ turn: state.turn, values });
    if (hist.length > 500) hist.shift();
  }

  if (state.extraTurn === true) {
    state.extraTurn = false;
    state.phase = 'roll';
    state.doublesCount = 0;
    out.events.push({ type: 'turnStart', playerId: p.id, meta: { turn: state.turn, extra: true } });
    return;
  }

  state.currentPlayerIndex = nextActiveIndex(state, state.currentPlayerIndex);
  state.turn += 1;

  // Sudden-death rule: at maxTurns the richest player wins (settles endless games).
  if (state.settings.maxTurns > 0 && state.turn >= state.settings.maxTurns) {
    const alive = activePlayers(state);
    let richest = alive[0];
    for (const pl of alive) {
      if (netWorth(state, pl.id) > netWorth(state, richest.id)) richest = pl;
    }
    state.phase = 'game-over';
    state.winnerId = richest.id;
    pushLog(state, richest.id, 'log.suddenDeath', { player: richest.name });
    out.events.push({ type: 'gameOver', playerId: richest.id, meta: { reason: 'sudden-death' } });
    return;
  }
  beginTurn(state, out);
}

// ─── Validation ─────────────────────────────────────────────────────────────

function requireCurrent(state: GameState, playerId: string): string | null {
  const cur = state.players[state.currentPlayerIndex];
  if (!cur || cur.id !== playerId) return 'error.notYourTurn';
  if (cur.bankrupt) return 'error.playerBankrupt';
  return null;
}

// ─── Main dispatcher ────────────────────────────────────────────────────────

export function applyAction(input: GameState, action: GameAction): ApplyResult {
  const state = structuredClone(input);
  const out: EngineOut = { events: [], logs: [] };
  const err = (msg: string): ApplyResult => ({ state: input, events: [], error: msg });

  switch (action.type) {
    case 'START_GAME': {
      if (state.phase !== 'lobby') return err('error.badPhase');
      if (activePlayers(state).length < 2) return err('error.needPlayers');
      beginTurn(state, out);
      break;
    }

    case 'ROLL_DICE': {
      let e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'roll') return err('error.badPhase');
      const p = playerById(state, action.playerId)!;

      const rs1: RngState = { seed: state.seed, counter: state.rngCounter++ };
      const rs2: RngState = { seed: state.seed, counter: state.rngCounter++ };
      const d1 = rollDie(rs1), d2 = rollDie(rs2);
      const roll: DiceRoll = { d1, d2, isDouble: d1 === d2, total: d1 + d2 };
      state.dice = roll;
      out.events.push({ type: 'diceRolled', playerId: p.id, dice: roll });

      // ── Jail attempt ──
      if (p.inJail) {
        if (roll.isDouble) {
          p.inJail = false;
          p.jailTurns = 0;
          pushLog(state, p.id, 'log.jailDoubles', { total: roll.total });
          out.events.push({ type: 'jailLeave', playerId: p.id });
          moveForward(state, p.id, roll.total, out);
          const r = resolveLanding(state, p.id, roll.total, out);
          const ph = state.phase as GamePhase;
          if (r === 'buy' || ph === 'debt' || ph === 'auction') break;
          state.phase = 'awaiting-end';
        } else {
          p.jailTurns += 1;
          if (p.jailTurns >= 3) {
            pushLog(state, p.id, 'log.jailThirdFail');
            const fine = state.settings.jailFine;
            const ok = payMoney(state, p.id, null, fine, out);
            out.events.push({ type: 'jailLeave', playerId: p.id });
            p.inJail = false;
            p.jailTurns = 0;
            if (!ok) break; // debt phase — resolve first; stay at space 10
            moveForward(state, p.id, roll.total, out);
            const r = resolveLanding(state, p.id, roll.total, out);
            const ph2 = state.phase as GamePhase;
            if (r === 'buy' || ph2 === 'debt' || ph2 === 'auction') break;
            state.phase = 'awaiting-end';
          } else {
            pushLog(state, p.id, 'log.jailStay');
            state.phase = 'awaiting-end';
          }
        }
        break;
      }

      // ── Triple doubles → jail ──
      if (roll.isDouble) {
        state.doublesCount += 1;
        if (state.doublesCount >= state.settings.startingDoublesToJail) {
          pushLog(state, p.id, 'log.speeding');
          sendToJail(state, p.id, out);
          state.phase = 'awaiting-end';
          break;
        }
      }

      moveForward(state, p.id, roll.total, out);
      const r = resolveLanding(state, p.id, roll.total, out);
      const ph3 = state.phase as GamePhase;
      if (r === 'buy' || ph3 === 'debt' || ph3 === 'auction') break;
      if (roll.isDouble) state.extraTurn = true;
      state.phase = 'awaiting-end';
      break;
    }

    case 'BUY_PROPERTY': {
      const e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'buy-decision') return err('error.badPhase');
      const p = playerById(state, action.playerId)!;
      const spaceId = p.position;
      const data = BOARD[spaceId];
      if (!data.price) return err('error.notForSale');
      if (state.spaces[spaceId].ownerId) return err('error.alreadyOwned');
      if (p.cash < data.price) return err('error.noCash');
      p.cash -= data.price;
      state.spaces[spaceId].ownerId = p.id;
      state.stats.propertiesBought[p.id] = (state.stats.propertiesBought[p.id] ?? 0) + 1;
      if (!state.stats.biggestDeal || data.price > state.stats.biggestDeal.amount) {
        state.stats.biggestDeal = { playerId: p.id, amount: data.price };
      }
      pushLog(state, p.id, 'log.bought', { space: data.name, price: data.price });
      out.events.push({ type: 'propertyBought', playerId: p.id, spaceId, amount: data.price });
      out.events.push({ type: 'emotion', playerId: p.id, emotion: 'happy' });
      if (state.dice?.isDouble && !p.inJail) state.extraTurn = true;
      state.phase = 'awaiting-end';
      break;
    }

    case 'DECLINE_BUY': {
      const e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'buy-decision') return err('error.badPhase');
      const p = playerById(state, action.playerId)!;
      const spaceId = p.position;
      pushLog(state, p.id, 'log.declined', { space: BOARD[spaceId].name });
      if (state.dice?.isDouble && !p.inJail) state.extraTurn = true;
      if (state.settings.auctionsEnabled) {
        startAuction(state, spaceId, out);
      } else {
        state.phase = 'awaiting-end';
      }
      break;
    }

    case 'BID': {
      if (state.phase !== 'auction' || !state.pendingAuction) return err('error.noAuction');
      const a = state.pendingAuction;
      const ve = validateBid(state, action.playerId, action.amount);
      if (ve) return err(ve);
      a.currentBid = action.amount;
      a.bids[action.playerId] = action.amount;
      a.highestBidderId = action.playerId;
      out.events.push({ type: 'auctionBid', playerId: action.playerId, amount: action.amount, spaceId: a.spaceId });
      const order = auctionActiveOrder(state);
      const othersPass = order.filter((id) => id !== action.playerId && !a.passed.includes(id));
      if (othersPass.length === 0) {
        settleAuction(state, out);
      } else {
        advanceAuction(state);
      }
      break;
    }

    case 'PASS_BID': {
      if (state.phase !== 'auction' || !state.pendingAuction) return err('error.noAuction');
      const a = state.pendingAuction;
      if (a.activePlayerId !== action.playerId) return err('error.notYourBid');
      if (a.passed.includes(action.playerId)) return err('error.alreadyPassed');
      a.passed.push(action.playerId);
      out.events.push({ type: 'auctionPassed', playerId: action.playerId, spaceId: a.spaceId });
      const remaining = auctionActiveOrder(state).filter((id) => !a.passed.includes(id));
      const highestActive = a.highestBidderId && !a.passed.includes(a.highestBidderId);
      if (remaining.length === 0 || (remaining.length === 1 && highestActive && remaining[0] === a.highestBidderId)) {
        settleAuction(state, out);
      } else if (remaining.length === 1 && !highestActive) {
        a.activePlayerId = remaining[0];
      } else {
        advanceAuction(state);
      }
      break;
    }

    case 'END_TURN': {
      const e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'awaiting-end') return err('error.badPhase');
      endTurn(state, out);
      break;
    }

    case 'BUILD_HOUSE': {
      const perr = state.debt
        ? (action.playerId === state.debt.playerId ? null : 'error.notYourTurn')
        : requireCurrent(state, action.playerId);
      if (perr) return err(perr);
      if (state.phase !== 'awaiting-end' && state.phase !== 'debt') return err('error.badPhase');
      const buildErr = buildHouse(state, action.playerId, action.spaceId, out);
      if (buildErr) return err(buildErr);
      if (state.phase === 'debt') trySettleDebt(state, out);
      break;
    }

    case 'SELL_HOUSE': {
      const perr = state.debt
        ? (action.playerId === state.debt.playerId ? null : 'error.notYourTurn')
        : requireCurrent(state, action.playerId);
      if (perr) return err(perr);
      if (state.phase !== 'awaiting-end' && state.phase !== 'debt') return err('error.badPhase');
      const sellErr = sellHouse(state, action.playerId, action.spaceId, out);
      if (sellErr) return err(sellErr);
      if (state.phase === 'debt') trySettleDebt(state, out);
      break;
    }

    case 'MORTGAGE': {
      const perr = state.debt
        ? (action.playerId === state.debt.playerId ? null : 'error.notYourTurn')
        : requireCurrent(state, action.playerId);
      if (perr) return err(perr);
      if (state.phase !== 'awaiting-end' && state.phase !== 'debt') return err('error.badPhase');
      const mErr = mortgage(state, action.playerId, action.spaceId, out);
      if (mErr) return err(mErr);
      if (state.phase === 'debt') trySettleDebt(state, out);
      break;
    }

    case 'UNMORTGAGE': {
      const perr = state.debt
        ? (action.playerId === state.debt.playerId ? null : 'error.notYourTurn')
        : requireCurrent(state, action.playerId);
      if (perr) return err(perr);
      if (state.phase !== 'awaiting-end' && state.phase !== 'debt') return err('error.badPhase');
      const uErr = unmortgage(state, action.playerId, action.spaceId, out);
      if (uErr) return err(uErr);
      if (state.phase === 'debt') trySettleDebt(state, out);
      break;
    }

    case 'PAY_JAIL_FINE': {
      const e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'roll') return err('error.badPhase');
      const p = playerById(state, action.playerId)!;
      if (!p.inJail) return err('error.notInJail');
      const ok = payMoney(state, p.id, null, state.settings.jailFine, out);
      if (!ok) break; // debt panel opens; fine still pending
      p.inJail = false;
      p.jailTurns = 0;
      out.events.push({ type: 'jailLeave', playerId: p.id });
      pushLog(state, p.id, 'log.jailPaidFine', { fine: state.settings.jailFine });
      break;
    }

    case 'USE_JAIL_CARD': {
      const e = requireCurrent(state, action.playerId);
      if (e) return err(e);
      if (state.phase !== 'roll') return err('error.badPhase');
      const p = playerById(state, action.playerId)!;
      if (!p.inJail) return err('error.notInJail');
      if (p.getOutOfJailCards < 1) return err('error.noJailCards');
      p.getOutOfJailCards -= 1;
      p.inJail = false;
      p.jailTurns = 0;
      out.events.push({ type: 'jailLeave', playerId: p.id });
      pushLog(state, p.id, 'log.jailCardUsed');
      break;
    }

    case 'PROPOSE_TRADE': {
      if (!['awaiting-end', 'roll'].includes(state.phase)) return err('error.badPhase');
      const offer = normalizeOffer(state, action.offer);
      if (offer.fromId !== action.playerId) return err('error.notYourTurn');
      const ve = validateOffer(state, offer);
      if (ve) return err(ve);
      state.prevPhase = state.phase;
      state.tradeCooldownTurn = state.turn;
      state.pendingTrade = { offer, id: `t${state.logSeq}-${state.turn}` };
      state.phase = 'trade-pending';
      pushLog(state, offer.fromId, 'log.tradeOffered', { to: playerById(state, offer.toId)!.name });
      out.events.push({ type: 'tradeOffered', playerId: offer.fromId, meta: { offer } });
      break;
    }

    case 'ACCEPT_TRADE': {
      if (state.phase !== 'trade-pending' || !state.pendingTrade) return err('error.noTrade');
      const { offer } = state.pendingTrade;
      if (offer.toId !== action.playerId) return err('error.notYourTurn');
      executeTrade(state, offer, out);
      state.pendingTrade = null;
      state.phase = state.prevPhase ?? 'awaiting-end';
      break;
    }

    case 'DECLINE_TRADE': {
      if (state.phase !== 'trade-pending' || !state.pendingTrade) return err('error.noTrade');
      if (state.pendingTrade.offer.toId !== action.playerId) return err('error.notYourTurn');
      pushLog(state, action.playerId, 'log.tradeDeclined');
      out.events.push({ type: 'tradeDeclined', playerId: action.playerId });
      state.pendingTrade = null;
      state.phase = state.prevPhase ?? 'awaiting-end';
      break;
    }

    case 'DECLARE_BANKRUPTCY': {
      if (!state.debt || state.debt.playerId !== action.playerId) return err('error.noDebt');
      settleBankruptcy(state, action.playerId, state.debt.creditorId, out);
      state.debt = null;
      if (state.phase !== 'game-over') {
        const wasCurrent = state.players[state.currentPlayerIndex].id === action.playerId;
        if (wasCurrent) {
          // skip to next active player's turn
          state.currentPlayerIndex = nextActiveIndex(state, state.currentPlayerIndex);
          state.turn += 1;
          beginTurn(state, out);
        } else {
          state.phase = 'awaiting-end';
        }
      }
      break;
    }

    default:
      return err('error.unknownAction');
  }

  for (const l of out.logs) pushLog(state, l.playerId, l.key, l.params);
  return { state, events: out.events };
}
