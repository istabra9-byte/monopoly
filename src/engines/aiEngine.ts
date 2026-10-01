/**
 * AIEngine — bot brains for Easy / Normal / Hard with personalities
 * (aggressive / cautious / trader / balanced). Pure: reads a GameState and
 * returns the next GameAction the bot wants to take (or null = think more /
 * nothing available). The UI layer adds "thinking" delays.
 */
import type { GameState, GameAction, TradeOffer, Player } from './types';
import { BOARD, DISTRICTS } from '../data/board';
import {
  playerById, activePlayers, hasMonopoly, districtStreets, netWorth,
  canBuildHouse, canSellHouse,
} from './economyEngine';

type Difficulty = 'easy' | 'normal' | 'hard';

const RESERVE: Record<Difficulty, number> = { easy: 0, normal: 100, hard: 220 };
const PERSONALITY_BID: Record<string, number> = {
  aggressive: 1.25, balanced: 1.0, cautious: 0.85, trader: 1.05,
};

/** How valuable is owning space `id` for player `p`? (0 = worthless) */
export function evaluateProperty(state: GameState, p: Player, spaceId: number): number {
  const data = BOARD[spaceId];
  if (!data.price) return 0;
  let value = data.price;

  if (data.type === 'street') {
    const d = data.district!;
    const ids = districtStreets(d);
    const mine = ids.filter((id) => state.spaces[id].ownerId === p.id).length;
    const theirs = ids.filter((id) => {
      const o = state.spaces[id].ownerId;
      return o && o !== p.id;
    }).length;
    if (mine === ids.length - 1) value *= 2.6;           // completes my set
    else if (mine > 0) value *= 1.5;                     // grows my set
    if (theirs === ids.length - 1) value *= 1.9;         // blocks opponent set
    else if (theirs >= 1 && ids.length === 2) value *= 1.3;
  } else if (data.type === 'station') {
    const mine = BOARD.filter((s) => s.type === 'station' && state.spaces[s.id].ownerId === p.id).length;
    if (mine === 3) value *= 2.0;
    else if (mine >= 1) value *= 1.3;
  } else if (data.type === 'utility') {
    const mine = BOARD.filter((s) => s.type === 'utility' && state.spaces[s.id].ownerId === p.id).length;
    if (mine === 1) value *= 1.6;
  }
  return value;
}

function liquidity(state: GameState, p: Player): number {
  return p.cash + state.spaces.reduce((acc, ss, i) => {
    if (ss.ownerId !== p.id || ss.mortgaged) return acc;
    return acc + (BOARD[i].mortgageValue ?? 0);
  }, 0);
}

/** Best single liquidation move that frees the most cash per value lost. */
function liquidationAction(state: GameState, p: Player, need: number): GameAction | null {
  // 1) sell buildings (highest refund first, only valid even-build moves)
  const withHouses = state.spaces
    .map((ss, i) => ({ ss, i }))
    .filter(({ ss, i }) => ss.ownerId === p.id && ss.houses > 0 && canSellHouse(state, p.id, i) === null)
    .sort((a, b) => (BOARD[b.i].houseCost ?? 0) - (BOARD[a.i].houseCost ?? 0));
  if (withHouses.length > 0) {
    return { type: 'SELL_HOUSE', playerId: p.id, spaceId: withHouses[0].i };
  }
  // 2) mortgage properties (lowest value first to keep big assets)
  const mortgageable = state.spaces
    .map((ss, i) => ({ ss, i }))
    .filter(({ ss, i }) => ss.ownerId === p.id && !ss.mortgaged && !(BOARD[i].type === 'street' && ss.houses > 0))
    .sort((a, b) => (BOARD[a.i].mortgageValue ?? 0) - (BOARD[b.i].mortgageValue ?? 0));
  if (mortgageable.length > 0) {
    return { type: 'MORTGAGE', playerId: p.id, spaceId: mortgageable[0].i };
  }
  void need;
  return null;
}

/** Evaluate an incoming trade offer from the receiver's perspective. */
export function evaluateTrade(state: GameState, offer: TradeOffer): number {
  const me = playerById(state, offer.toId)!;
  let score = offer.getCash - offer.giveCash;         // cash in hand
  for (const id of offer.getProperties) score += evaluateProperty(state, me, id);
  for (const id of offer.giveProperties) score -= evaluateProperty(state, me, id) * 1.1;
  score += offer.getJailCards * 80;
  score -= offer.giveJailCards * 80;
  return score;
}

function tradeBotWouldPropose(state: GameState, bot: Player): TradeOffer | null {
  if (state.turn < 6) return null;
  const diff = bot.botDifficulty ?? 'normal';
  if (diff === 'easy') return null;

  // Look for a property that completes my set, held by someone who might accept.
  for (const data of BOARD) {
    if (data.type !== 'street') continue;
    const ss = state.spaces[data.id];
    if (!ss.ownerId || ss.ownerId === bot.id) continue;
    const ids = districtStreets(data.district!);
    const mine = ids.filter((id) => state.spaces[id].ownerId === bot.id).length;
    if (mine !== ids.length - 1) continue; // not completing

    const owner = playerById(state, ss.ownerId)!;
    if (owner.isBot && owner.botDifficulty === 'easy') continue;
    // Offer: cash + maybe one of my properties the owner needs.
    const myValue = evaluateProperty(state, owner, data.id);
    let giveCash = Math.min(bot.cash - RESERVE[diff] > 0 ? bot.cash - RESERVE[diff] : 0, Math.ceil(myValue * 1.35));
    let giveProps: number[] = [];
    // sweeten with a property owner lacks (from a district I'm weak in)
    for (const myId of state.spaces.map((s2, i) => i).filter((i) => state.spaces[i].ownerId === bot.id)) {
      const md = BOARD[myId];
      if (md.type !== 'street') continue;
      const ownerIds = districtStreets(md.district!);
      const ownerOwns = ownerIds.filter((id2) => state.spaces[id2].ownerId === owner.id).length;
      if (ownerOwns === ownerIds.length - 1 && giveProps.length === 0 && !state.spaces[myId].mortgaged) {
        giveProps = [myId];
        giveCash = Math.max(0, giveCash - Math.ceil(evaluateProperty(state, bot, myId) * 0.8));
        break;
      }
    }
    if (giveCash >= 50 || giveProps.length > 0) {
      return {
        fromId: bot.id, toId: owner.id,
        giveCash, getCash: 0,
        giveProperties: giveProps, getProperties: [data.id],
        giveJailCards: 0, getJailCards: 0,
      };
    }
  }
  return null;
}

/**
 * Main brain. Returns the next action for the given bot, or null.
 */
export function decideBotAction(state: GameState, playerId: string): GameAction | null {
  const bot = playerById(state, playerId);
  if (!bot || bot.bankrupt) return null;
  const diff = bot.botDifficulty ?? 'normal';
  const pers = bot.botPersonality ?? 'balanced';
  const reserve = RESERVE[diff];

  // ── Debt: liquidate or go bust ──
  if (state.phase === 'debt' && state.debt?.playerId === playerId) {
    const need = state.debt.amount;
    if (netWorth(state, playerId) < need) return { type: 'DECLARE_BANKRUPTCY', playerId };
    const liq = liquidationAction(state, bot, need);
    return liq ?? { type: 'DECLARE_BANKRUPTCY', playerId };
  }

  // ── Auction ──
  if (state.phase === 'auction' && state.pendingAuction?.activePlayerId === playerId) {
    const a = state.pendingAuction;
    const worth = evaluateProperty(state, bot, a.spaceId) * (PERSONALITY_BID[pers] ?? 1);
    const bidCap = Math.floor(Math.min(worth, bot.cash));
    const increment = Math.max(10, Math.ceil(a.currentBid * 0.1 / 10) * 10);
    const nextBid = Math.min(bidCap, Math.max(a.currentBid + increment, 10));
    const firstBid = Math.min(bidCap, Math.max(10, Math.floor(worth * 0.55 / 10) * 10));
    if (a.currentBid === 0) {
      // easy bots sometimes skip bidding entirely
      if (diff === 'easy' && Math.random() < 0.25) return { type: 'PASS_BID', playerId };
      return nextBid >= 10 ? { type: 'BID', playerId, amount: firstBid } : { type: 'PASS_BID', playerId };
    }
    if (a.highestBidderId !== playerId && nextBid > a.currentBid && nextBid <= bidCap) {
      // hard bots stop when overpaying vs worth; easy bots sometimes overbid
      if (diff === 'easy' && nextBid > worth) return { type: 'PASS_BID', playerId };
      return { type: 'BID', playerId, amount: nextBid };
    }
    return { type: 'PASS_BID', playerId };
  }

  // ── Incoming trade ──
  if (state.phase === 'trade-pending' && state.pendingTrade?.offer.toId === playerId) {
    const score = evaluateTrade(state, state.pendingTrade.offer);
    const threshold = diff === 'hard' ? 20 : diff === 'normal' ? 0 : -100;
    return score >= threshold
      ? { type: 'ACCEPT_TRADE', playerId }
      : { type: 'DECLINE_TRADE', playerId };
  }

  if (state.players[state.currentPlayerIndex]?.id !== playerId) return null;

  switch (state.phase) {
    case 'roll': {
      if (bot.inJail) {
        // Strategy: use card > pay fine early game (worth moving) > roll.
        if (bot.getOutOfJailCards > 0) return { type: 'USE_JAIL_CARD', playerId };
        const lateGame = state.turn > 30;
        if (!lateGame && bot.cash >= state.settings.jailFine + reserve + 100) {
          return { type: 'PAY_JAIL_FINE', playerId };
        }
        return { type: 'ROLL_DICE', playerId };
      }
      return { type: 'ROLL_DICE', playerId };
    }

    case 'buy-decision': {
      const p = bot.position;
      const data = BOARD[p];
      if (!data.price) return { type: 'DECLINE_BUY', playerId };
      const worth = evaluateProperty(state, bot, p) * (PERSONALITY_BID[pers] ?? 1);
      const canAfford = bot.cash - data.price >= (diff === 'easy' ? 0 : reserve);
      if (canAfford && (diff === 'easy' ? data.price <= bot.cash : worth >= data.price * 0.75)) {
        return { type: 'BUY_PROPERTY', playerId };
      }
      return { type: 'DECLINE_BUY', playerId };
    }

    case 'awaiting-end': {
      // 1) emergency unmortgage skipped (bots keep cash).
      // 2) build houses on monopolies.
      if (diff !== 'easy' || bot.cash > 400) {
        const candidates: number[] = [];
        for (const data of BOARD) {
          if (data.type !== 'street') continue;
          const ss = state.spaces[data.id];
          if (ss.ownerId !== playerId || ss.mortgaged || ss.houses >= 5) continue;
          if (!hasMonopoly(state, playerId, data.district!)) continue;
          candidates.push(data.id);
        }
        // build on the property with fewest houses (even build)
        const buildable = candidates.filter((id) => canBuildHouse(state, playerId, id) === null);
        const minHouse = Math.min(...buildable.map((id) => state.spaces[id].houses), 99);
        const target = buildable.find((id) => state.spaces[id].houses === minHouse);
        if (target !== undefined && bot.cash - (BOARD[target].houseCost ?? 0) >= reserve + 50) {
          return { type: 'BUILD_HOUSE', playerId, spaceId: target };
        }
      }
      // 3) unmortgage if very rich (hard only)
      if (diff === 'hard' && bot.cash > 800) {
        const mortgaged = state.spaces
          .map((ss, i) => ({ ss, i }))
          .filter(({ ss, i }) => ss.ownerId === playerId && ss.mortgaged)
          .sort((a, b) => (BOARD[a.i].mortgageValue ?? 0) - (BOARD[b.i].mortgageValue ?? 0))[0];
        if (mortgaged) {
          const cost = Math.ceil((BOARD[mortgaged.i].mortgageValue ?? 0) * (state.settings.strictMortgage ? 1.1 : 1));
          if (bot.cash - cost >= reserve) return { type: 'UNMORTGAGE', playerId, spaceId: mortgaged.i };
        }
      }
      // 4) propose a set-completing trade (traders & hard bots, occasionally)
      if ((pers === 'trader' || diff === 'hard') && state.turn % 3 === 0 && state.tradeCooldownTurn !== state.turn) {
        const offer = tradeBotWouldPropose(state, bot);
        if (offer) {
          const check = { ...state };
          void check;
          return { type: 'PROPOSE_TRADE', playerId, offer };
        }
      }
      return { type: 'END_TURN', playerId };
    }

    default:
      return null;
  }
}

/** List of bot ids that owe the game a decision right now (for host loop). */
export function pendingBotIds(state: GameState): string[] {
  const out: string[] = [];
  const current = state.players[state.currentPlayerIndex];
  if (current?.isBot && !current.bankrupt) {
    if (['roll', 'buy-decision', 'awaiting-end'].includes(state.phase)) out.push(current.id);
  }
  if (state.phase === 'debt' && state.debt) {
    const debtor = playerById(state, state.debt.playerId);
    if (debtor?.isBot) out.push(debtor.id);
  }
  if (state.phase === 'auction' && state.pendingAuction?.activePlayerId) {
    const bidder = playerById(state, state.pendingAuction.activePlayerId);
    if (bidder?.isBot) out.push(bidder.id);
  }
  if (state.phase === 'trade-pending' && state.pendingTrade) {
    const target = playerById(state, state.pendingTrade.offer.toId);
    if (target?.isBot) out.push(target.id);
  }
  return out;
}

export function activePlayers_(state: GameState) { return activePlayers(state); }
export function districtsRef() { return DISTRICTS; }
