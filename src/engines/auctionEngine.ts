/**
 * AuctionEngine — real auction when a player declines to buy.
 * Sealed-bid turn cycle: the eligible players bid in rotation; each BID must
 * exceed the current bid; PASS removes the player from the round. The last
 * remaining bidder wins at their own highest standing bid. If everyone passes
 * with no bid, the property stays with the bank.
 */
import type { GameState, EngineOut } from './types';
import { BOARD } from '../data/board';
import { playerById, activePlayers, pushLog } from './economyEngine';

export type AuctionOut = EngineOut;

export function startAuction(state: GameState, spaceId: number, out: AuctionOut): void {
  const eligible = activePlayers(state).map((p) => p.id);
  state.pendingAuction = {
    spaceId,
    bids: {},
    activePlayerId: eligible[0] ?? null,
    currentBid: 0,
    highestBidderId: null,
    passed: [],
    turnDeadline: null,
  };
  state.phase = 'auction';
  pushLog(state, undefined, 'log.auctionStart', { space: BOARD[spaceId].name });
  out.events.push({ type: 'auctionStart', spaceId });
}

export function auctionActiveOrder(state: GameState): string[] {
  const a = state.pendingAuction;
  if (!a) return [];
  return activePlayers(state)
    .map((p) => p.id)
    .filter((id) => !a.passed.includes(id));
}

/** Advance to the next eligible bidder; returns false if auction should settle. */
export function advanceAuction(state: GameState): boolean {
  const a = state.pendingAuction;
  if (!a) return false;
  const order = auctionActiveOrder(state);
  if (order.length === 0) return false;
  if (order.length === 1 && a.highestBidderId === order[0]) return false; // only bidder already highest
  const idx = order.indexOf(a.activePlayerId ?? '');
  const next = order[(idx + 1) % order.length];
  if (order.length === 1) {
    a.activePlayerId = order[0];
    return true;
  }
  a.activePlayerId = next;
  return true;
}

export interface AuctionSettle {
  winnerId: string | null;
  amount: number;
  spaceId: number;
}

/** Settle the auction: winner pays and receives the deed. */
export function settleAuction(state: GameState, out: AuctionOut): AuctionSettle | null {
  const a = state.pendingAuction;
  if (!a) return null;
  const data = BOARD[a.spaceId];
  let winnerId = a.highestBidderId;
  let amount = a.currentBid;

  // If nobody ever bid, no sale.
  if (!winnerId || amount <= 0) {
    pushLog(state, undefined, 'log.auctionNoBids', { space: data.name });
    state.pendingAuction = null;
    state.phase = 'awaiting-end';
    out.events.push({ type: 'auctionPassed', spaceId: a.spaceId });
    return { winnerId: null, amount: 0, spaceId: a.spaceId };
  }

  const winner = playerById(state, winnerId);
  if (!winner || winner.cash < amount) {
    // Defensive: if the winner somehow can't pay (shouldn't happen — bids are
    // validated against cash), fall back to the deed staying with the bank.
    pushLog(state, undefined, 'log.auctionNoBids', { space: data.name });
    state.pendingAuction = null;
    state.phase = 'awaiting-end';
    return { winnerId: null, amount: 0, spaceId: a.spaceId };
  }

  winner.cash -= amount;
  state.spaces[a.spaceId].ownerId = winnerId;
  pushLog(state, winnerId, 'log.auctionWon', { space: data.name, amount });
  out.events.push({ type: 'auctionWon', playerId: winnerId, spaceId: a.spaceId, amount });
  state.pendingAuction = null;
  state.phase = 'awaiting-end';
  return { winnerId, amount, spaceId: a.spaceId };
}

export function validateBid(state: GameState, playerId: string, amount: number): string | null {
  const a = state.pendingAuction;
  if (!a) return 'error.noAuction';
  if (state.phase !== 'auction') return 'error.noAuction';
  if (a.activePlayerId !== playerId) return 'error.notYourBid';
  if (a.passed.includes(playerId)) return 'error.alreadyPassed';
  const p = playerById(state, playerId);
  if (!p) return 'error.noPlayer';
  if (amount <= a.currentBid) return 'error.bidTooLow';
  if (amount > p.cash) return 'error.bidAboveCash';
  if (!Number.isInteger(amount)) return 'error.bidInteger';
  return null;
}
