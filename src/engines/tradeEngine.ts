/**
 * TradeEngine — offer/counter/accept/decline of cash + properties + jail
 * cards. Validation mirrors classic rules: no buildings on traded deeds,
 * mortgaged deeds transfer as-is (buyer accepts the liability), cash must
 * exist, jail card counts must exist.
 */
import type { GameState, TradeOffer, EngineOut } from './types';
import { BOARD } from '../data/board';
import { playerById, pushLog } from './economyEngine';

export type TradeOut = EngineOut;

export function validateOffer(state: GameState, offer: TradeOffer): string | null {
  const from = playerById(state, offer.fromId);
  const to = playerById(state, offer.toId);
  if (!from || !to) return 'error.noPlayer';
  if (from.bankrupt || to.bankrupt) return 'error.playerBankrupt';
  if (offer.giveCash < 0 || offer.getCash < 0) return 'error.negative';
  if (from.cash < offer.giveCash) return 'error.noCash';
  if (to.cash < offer.getCash) return 'error.noCash';
  if (from.getOutOfJailCards < offer.giveJailCards) return 'error.noJailCards';
  if (to.getOutOfJailCards < offer.getJailCards) return 'error.noJailCards';

  for (const id of offer.giveProperties) {
    const ss = state.spaces[id];
    const data = BOARD[id];
    if (!ss || !data) return 'error.badSpace';
    if (ss.ownerId !== offer.fromId) return 'error.notOwner';
    if (data.type === 'street' && ss.houses > 0) return 'error.hasBuildings';
  }
  for (const id of offer.getProperties) {
    const ss = state.spaces[id];
    const data = BOARD[id];
    if (!ss || !data) return 'error.badSpace';
    if (ss.ownerId !== offer.toId) return 'error.notOwner';
    if (data.type === 'street' && ss.houses > 0) return 'error.hasBuildings';
  }
  if (
    offer.giveCash === 0 && offer.getCash === 0 &&
    offer.giveProperties.length === 0 && offer.getProperties.length === 0 &&
    offer.giveJailCards === 0 && offer.getJailCards === 0
  ) return 'error.emptyTrade';
  return null;
}

export function executeTrade(state: GameState, offer: TradeOffer, out: TradeOut): void {
  const from = playerById(state, offer.fromId)!;
  const to = playerById(state, offer.toId)!;

  from.cash -= offer.giveCash;
  to.cash += offer.giveCash;
  to.cash -= offer.getCash;
  from.cash += offer.getCash;

  const fromCards = from.getOutOfJailCards;
  const toCards = to.getOutOfJailCards;
  from.getOutOfJailCards = fromCards - offer.giveJailCards + offer.getJailCards;
  to.getOutOfJailCards = toCards - offer.getJailCards + offer.giveJailCards;

  for (const id of offer.giveProperties) state.spaces[id].ownerId = to.id;
  for (const id of offer.getProperties) state.spaces[id].ownerId = from.id;

  const dealValue = offer.giveCash + offer.getCash + offer.giveProperties.length * 100 + offer.getProperties.length * 100;
  const stats = state.stats;
  if (!stats.biggestDeal || dealValue > stats.biggestDeal.amount) {
    stats.biggestDeal = { playerId: from.id, amount: dealValue };
  }

  pushLog(state, offer.fromId, 'log.tradeDone', { from: from.name, to: to.name });
  out.events.push({ type: 'tradeAccepted', playerId: offer.fromId, meta: { offer } });
}

export function normalizeOffer(state: GameState, raw: TradeOffer): TradeOffer {
  return {
    fromId: raw.fromId,
    toId: raw.toId,
    giveCash: Math.max(0, Math.floor(raw.giveCash || 0)),
    getCash: Math.max(0, Math.floor(raw.getCash || 0)),
    giveProperties: [...new Set(raw.giveProperties)].filter((id) => id >= 0 && id < 40),
    getProperties: [...new Set(raw.getProperties)].filter((id) => id >= 0 && id < 40),
    giveJailCards: Math.max(0, Math.floor(raw.giveJailCards || 0)),
    getJailCards: Math.max(0, Math.floor(raw.getJailCards || 0)),
  };
}
