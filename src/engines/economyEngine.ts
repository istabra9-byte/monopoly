/**
 * EconomyEngine — cash flows, rent, buildings, mortgages, liquidation,
 * bankruptcy settlement. Pure functions over GameState.
 */
import type {
  GameState, Player, SpaceData, DistrictId, GameEvent, EngineOut,
} from './types';
import { BOARD } from '../data/board';

export const CLONE = <T>(x: T): T => structuredClone(x);

export function spaceData(id: number): SpaceData {
  return BOARD[id];
}

export function districtStreets(d: DistrictId): number[] {
  return BOARD.filter((s) => s.district === d && s.type === 'street').map((s) => s.id);
}

export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

/** Does ownerId own every street in the district (full set / monopoly)? */
export function hasMonopoly(state: GameState, ownerId: string, d: DistrictId): boolean {
  const ids = districtStreets(d);
  return ids.every((id) => state.spaces[id].ownerId === ownerId);
}

export function ownedStations(state: GameState, ownerId: string): number {
  return BOARD.filter((s) => s.type === 'station').filter((s) => state.spaces[s.id].ownerId === ownerId).length;
}

export function ownedUtilities(state: GameState, ownerId: string): number {
  return BOARD.filter((s) => s.type === 'utility').filter((s) => state.spaces[s.id].ownerId === ownerId).length;
}

export interface RentContext {
  diceTotal: number | null;      // for utilities
  forcedMultiplier10x?: boolean; // card-driven utility
  payDoubleStation?: boolean;    // card-driven station
}

/** Pure rent computation for a space. */
export function computeRent(state: GameState, spaceId: number, ctx: RentContext): number {
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (!ss.ownerId || ss.mortgaged) return 0;
  if (data.type === 'street') {
    const rentTable = data.rent!;
    let rent = rentTable[Math.min(ss.houses, 5)];
    if (ss.houses === 0 && hasMonopoly(state, ss.ownerId, data.district!)) rent *= 2;
    return rent;
  }
  if (data.type === 'station') {
    const table = [25, 50, 100, 200];
    let rent = table[Math.max(0, ownedStations(state, ss.ownerId) - 1)];
    if (ctx.payDoubleStation) rent *= 2;
    return rent;
  }
  if (data.type === 'utility') {
    const count = ownedUtilities(state, ss.ownerId);
    const mult = ctx.forcedMultiplier10x ? 10 : count === 2 ? 10 : 4;
    return (ctx.diceTotal ?? 0) * mult;
  }
  return 0;
}

export type EconOut = EngineOut;

function log(out: EconOut, key: string, params?: Record<string, string | number>, playerId?: string) {
  out.logs.push({ key, params, playerId });
}

export function pushLog(state: GameState, playerId: string | undefined, key: string, params?: Record<string, string | number>): void {
  state.logSeq += 1;
  state.log.push({ id: state.logSeq, ts: Date.now(), playerId, key, params });
  if (state.log.length > 250) state.log.splice(0, state.log.length - 250);
}

/**
 * Move money. Returns true if fully paid; false if a debt was created
 * (caller must set phase='debt'). `toId === null` means the bank.
 */
export function payMoney(
  state: GameState, fromId: string, toId: string | null, amount: number, out: EconOut
): boolean {
  const from = playerById(state, fromId);
  if (!from || amount <= 0) return true;
  if (from.cash >= amount) {
    from.cash -= amount;
    if (toId) {
      const to = playerById(state, toId);
      if (to) to.cash += amount;
    }
    out.events.push({ type: 'cashChange', playerId: fromId, amount: -amount, meta: { toId } });
    if (toId) out.events.push({ type: 'cashChange', playerId: toId, amount, meta: { fromId } });
    return true;
  }
  // insufficient — debt to `toId`
  state.debt = { playerId: fromId, creditorId: toId, amount };
  state.phase = 'debt';
  out.events.push({ type: 'notEnoughMoney', playerId: fromId, amount, meta: { toId } });
  return false;
}

/** Tax payment with optional jackpot pool. */
export function payTax(state: GameState, fromId: string, amount: number, out: EconOut): boolean {
  const from = playerById(state, fromId);
  if (!from) return true;
  if (from.cash >= amount) {
    from.cash -= amount;
    if (state.settings.freeParkingJackpot) state.freeParkingPool += amount;
    out.events.push({ type: 'taxPaid', playerId: fromId, amount });
    log(out, 'log.taxPaid', { amount }, fromId);
    return true;
  }
  state.debt = { playerId: fromId, creditorId: null, amount };
  state.phase = 'debt';
  out.events.push({ type: 'notEnoughMoney', playerId: fromId, amount });
  return false;
}

/** Collect from bank (free money — changes total supply). */
export function collectFromBank(state: GameState, toId: string, amount: number, out: EconOut): void {
  const to = playerById(state, toId);
  if (!to || amount <= 0) return;
  to.cash += amount;
  out.events.push({ type: 'cashChange', playerId: toId, amount, meta: { fromBank: true } });
}

/** Total liquidation value available right now (cash + mortgage value + buildings at half). */
export function netWorth(state: GameState, playerId: string): number {
  const p = playerById(state, playerId);
  if (!p) return 0;
  let total = p.cash;
  state.spaces.forEach((ss, i) => {
    if (ss.ownerId !== playerId) return;
    const data = BOARD[i];
    total += ss.mortgaged ? 0 : data.mortgageValue ?? 0;
    if (data.type === 'street' && ss.houses > 0) {
      total += (ss.houses === 5 ? 5 : ss.houses) * ((data.houseCost ?? 0) / 2);
    }
  });
  return total;
}

/** Try to settle the current debt; returns true if cleared. */
export function trySettleDebt(state: GameState, out: EconOut): boolean {
  const debt = state.debt;
  if (!debt) return true;
  const p = playerById(state, debt.playerId);
  if (!p) { state.debt = null; return true; }
  if (p.cash >= debt.amount) {
    const toId = debt.creditorId;
    p.cash -= debt.amount;
    if (toId) {
      const to = playerById(state, toId);
      if (to) to.cash += debt.amount;
    }
    log(out, 'log.debtSettled', { amount: debt.amount }, p.id);
    state.debt = null;
    if (state.phase === 'debt') state.phase = 'awaiting-end';
    out.events.push({ type: 'cashChange', playerId: p.id, amount: -debt.amount, meta: { toId } });
    return true;
  }
  return false;
}

/** Pure validation for selling a house (even-build + bank supply). */
export function canSellHouse(state: GameState, playerId: string, spaceId: number): string | null {
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (data.type !== 'street') return 'error.notStreet';
  if (ss.ownerId !== playerId) return 'error.notOwner';
  if (ss.houses <= 0) return 'error.noHouses';
  const ids = districtStreets(data.district!);
  const maxHouses = Math.max(...ids.map((id) => state.spaces[id].houses));
  if (state.settings.evenBuild && ss.houses < maxHouses) return 'error.evenBuildSell';
  if (ss.houses === 5 && state.housesLeft < 4) return 'error.bankSupply';
  return null;
}

/** Pure validation for building a house (monopoly, even-build, supply, cash). */
export function canBuildHouse(state: GameState, playerId: string, spaceId: number): string | null {
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (data.type !== 'street') return 'error.notStreet';
  if (ss.ownerId !== playerId) return 'error.notOwner';
  if (!hasMonopoly(state, playerId, data.district!)) return 'error.needMonopoly';
  if (ss.mortgaged) return 'error.mortgaged';
  if (state.spaces.some((s2, i) => BOARD[i].district === data.district && s2.mortgaged)) return 'error.mortgaged';
  if (ss.houses >= 5) return 'error.hasHotel';
  const p = playerById(state, playerId);
  if (p && p.cash < (data.houseCost ?? 0)) return 'error.noCash';
  const ids = districtStreets(data.district!);
  const minHouses = Math.min(...ids.map((id) => state.spaces[id].houses));
  if (state.settings.evenBuild && ss.houses > minHouses) return 'error.evenBuild';
  if (ss.houses === 4) {
    if (state.hotelsLeft < 1 || state.housesLeft < 4) return 'error.bankSupply';
  } else if (state.housesLeft < 1) {
    return 'error.bankSupply';
  }
  return null;
}

/** Sell one house on a street (half price). Validates even-build. */
export function sellHouse(state: GameState, playerId: string, spaceId: number, out: EconOut): string | null {
  const pre = canSellHouse(state, playerId, spaceId);
  if (pre) return pre;
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (ss.houses === 5) {
    state.hotelsLeft += 1;
    state.housesLeft -= 4;
  } else {
    state.housesLeft += 1;
  }
  ss.houses -= 1;
  const refund = Math.floor((data.houseCost ?? 0) / 2);
  playerById(state, playerId)!.cash += refund;
  out.events.push({ type: 'houseSold', playerId, spaceId, amount: refund });
  log(out, 'log.houseSold', { space: data.name, refund }, playerId);
  return null;
}

/** Build one house (or upgrade to hotel at 5). Validates even-build + supply. */
export function buildHouse(state: GameState, playerId: string, spaceId: number, out: EconOut): string | null {
  const pre = canBuildHouse(state, playerId, spaceId);
  if (pre) return pre;
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  const cost = data.houseCost!;
  const p = playerById(state, playerId)!;
  p.cash -= cost;
  if (ss.houses === 4) {
    state.hotelsLeft -= 1;
    state.housesLeft -= 4;
  } else {
    state.housesLeft -= 1;
  }
  ss.houses += 1;
  out.events.push({ type: 'houseBuilt', playerId, spaceId, amount: cost });
  log(out, ss.houses === 5 ? 'log.hotelBuilt' : 'log.houseBuilt', { space: data.name, cost }, playerId);
  return null;
}

export function mortgage(state: GameState, playerId: string, spaceId: number, out: EconOut): string | null {
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (data.type !== 'street' && data.type !== 'station' && data.type !== 'utility') return 'error.notOwnable';
  if (ss.ownerId !== playerId) return 'error.notOwner';
  if (ss.mortgaged) return 'error.alreadyMortgaged';
  if (data.type === 'street' && ss.houses > 0) return 'error.hasBuildings';
  ss.mortgaged = true;
  const value = data.mortgageValue!;
  playerById(state, playerId)!.cash += value;
  out.events.push({ type: 'mortgaged', playerId, spaceId, amount: value });
  log(out, 'log.mortgaged', { space: data.name, value }, playerId);
  return null;
}

export function unmortgage(state: GameState, playerId: string, spaceId: number, out: EconOut): string | null {
  const data = spaceData(spaceId);
  const ss = state.spaces[spaceId];
  if (ss.ownerId !== playerId) return 'error.notOwner';
  if (!ss.mortgaged) return 'error.notMortgaged';
  const base = data.mortgageValue!;
  // Integer-safe 10% interest (Math.ceil(base * 1.1) hits IEEE rounding errors).
  const cost = state.settings.strictMortgage ? base + Math.ceil(base / 10) : base;
  const p = playerById(state, playerId)!;
  if (p.cash < cost) return 'error.noCash';
  p.cash -= cost;
  ss.mortgaged = false;
  out.events.push({ type: 'unmortgaged', playerId, spaceId, amount: cost });
  log(out, 'log.unmortgaged', { space: data.name, cost }, playerId);
  return null;
}

/**
 * Liquidation candidates for the debt panel: cheapest-first sell order.
 */
export function liquidationOptions(state: GameState, playerId: string): { sell: number[]; mortgage: number[] } {
  const sell: number[] = [];
  const mortgage: number[] = [];
  state.spaces.forEach((ss, i) => {
    if (ss.ownerId !== playerId) return;
    const data = BOARD[i];
    if (data.type === 'street' && ss.houses > 0) sell.push(i);
    if (!ss.mortgaged) mortgage.push(i);
  });
  return { sell, mortgage };
}

/**
 * Bankruptcy settlement: transfer everything to creditor (or bank).
 * Buildings are auto-sold to the bank at half price (official-style estate
 * liquidation); deeds transfer with their mortgage flags; jail cards transfer.
 */
export function settleBankruptcy(
  state: GameState, playerId: string, creditorId: string | null, out: EconOut
): void {
  const p = playerById(state, playerId)!;
  const creditor = creditorId ? playerById(state, creditorId) : null;
  const proceeds = { value: 0 };

  state.spaces.forEach((ss, i) => {
    if (ss.ownerId !== playerId) return;
    const data = BOARD[i];
    if (data.type === 'street' && ss.houses > 0) {
      proceeds.value += ss.houses === 5 ? 5 * Math.floor((data.houseCost ?? 0) / 2) : ss.houses * Math.floor((data.houseCost ?? 0) / 2);
      if (ss.houses === 5) state.hotelsLeft += 1;
      else state.housesLeft += ss.houses;
      ss.houses = 0;
    }
    if (creditor) {
      ss.ownerId = creditor.id;
    } else {
      ss.ownerId = null;
      ss.mortgaged = false;
    }
  });

  p.bankrupt = true;

  if (creditor) {
    creditor.cash += p.cash + proceeds.value;
    creditor.getOutOfJailCards += p.getOutOfJailCards;
  }
  p.cash = 0;
  p.getOutOfJailCards = 0;

  log(out, 'log.bankrupt', { player: p.name, creditor: creditor?.name ?? 'bank' }, p.id);
  out.events.push({ type: 'bankrupt', playerId: p.id, meta: { creditorId } });

  // game over check
  const remaining = activePlayers(state);
  if (remaining.length <= 1) {
    state.phase = 'game-over';
    state.winnerId = remaining[0]?.id ?? null;
    out.events.push({ type: 'gameOver', playerId: state.winnerId ?? undefined });
  }
}
