/**
 * CardEngine — Chance & Community Chest deck handling and effect application.
 * Deck order lives only in GameState (host-authoritative in multiplayer);
 * drawn cards go to the BOTTOM of the deck, jail-free cards are held out
 * until used, then returned.
 */
import type { GameState, CardData, GameEvent, Player, LogItem } from './types';
import { CARDS, CARDS_BY_ID } from '../data/board';
import { playerById } from './economyEngine';

export interface CardApplyOut {
  events: GameEvent[];
  logs: LogItem[];
  /** extra dice roll forced by "nearest utility" resolution */
  utilityDice?: number;
}

export function drawCard(state: GameState, deck: 'chance' | 'chest'): CardData | null {
  const pile = deck === 'chance' ? state.chanceDeck : state.chestDeck;
  if (pile.length === 0) return null;
  return CARDS_BY_ID[pile[0]];
}

/** Remove top card; caller re-inserts at bottom via returnCard. */
export function takeTop(state: GameState, deck: 'chance' | 'chest'): string {
  const pile = deck === 'chance' ? state.chanceDeck : state.chestDeck;
  return pile.shift()!;
}

export function returnCard(state: GameState, deck: 'chance' | 'chest', cardId: string): void {
  const pile = deck === 'chance' ? state.chanceDeck : state.chestDeck;
  pile.push(cardId);
}

/**
 * Apply a card effect. May mutate state deeply (moves, payments, jail).
 * Returns logs + any follow-up dice value needed by the rules engine.
 */
export function applyCardEffect(
  state: GameState,
  player: Player,
  card: CardData,
  out: CardApplyOut,
  movePlayerTo: (state: GameState, playerId: string, target: number, collectGoSalary: boolean, out: { events: GameEvent[]; logs: LogItem[] }) => 'rent' | 'buy' | 'none' | 'gotojail' | 'tax' | 'draw',
  resolveLanding: (state: GameState, player: Player, diceTotal: number | null, opts: { stationDouble?: boolean; utility10x?: boolean; utilityDice?: number }) => 'none' | 'buy' | 'debt' | 'draw',
  rngInt: () => number
): 'none' | 'buy' | 'debt' | 'draw' | 'gotojail' {
  const e = card.effect;
  out.logs.push({ key: card.titleKey, playerId: player.id });
  switch (e.kind) {
    case 'moveTo': {
      const passGo = e.space === 0 ? true : player.position > e.space;
      const result = movePlayerTo(state, player.id, e.space, e.collectGo === true || passGo, out);
      if (result === 'buy' || result === 'gotojail') return result as 'buy' | 'gotojail';
      if (result === 'tax' || result === 'none') return 'none';
      if (result === 'draw') return 'draw';
      return 'none';
    }
    case 'moveBack': {
      const target = (player.position - e.spaces + 40) % 40;
      movePlayerTo(state, player.id, target, false, out);
      return 'none';
    }
    case 'nearestStation': {
      const stations = [5, 15, 25, 35];
      const target = stations.find((s) => s > player.position) ?? stations[0];
      movePlayerTo(state, player.id, target, player.position > target, out);
      resolveLanding(state, player, null, { stationDouble: true });
      return 'none';
    }
    case 'nearestUtility': {
      const utils = [12, 28];
      const target = utils.find((s) => s > player.position) ?? utils[0];
      const dice = rngInt() % 12 + 1; // deterministic secondary roll from the host stream
      movePlayerTo(state, player.id, target, player.position > target, out);
      resolveLanding(state, player, dice, { utility10x: true, utilityDice: dice });
      return 'none';
    }
    case 'pay': {
      player.cash -= e.amount;
      if (player.cash < 0) {
        state.debt = { playerId: player.id, creditorId: null, amount: -player.cash };
        state.phase = 'debt';
        player.cash = 0;
        return 'debt';
      }
      out.events.push({ type: 'cashChange', playerId: player.id, amount: -e.amount });
      return 'none';
    }
    case 'collect': {
      player.cash += e.amount;
      out.events.push({ type: 'cashChange', playerId: player.id, amount: e.amount });
      return 'none';
    }
    case 'collectFromEach': {
      let total = 0;
      for (const other of state.players) {
        if (other.id === player.id || other.bankrupt) continue;
        const give = Math.min(other.cash, e.amount);
        other.cash -= give;
        total += give;
        out.events.push({ type: 'cashChange', playerId: other.id, amount: -give, meta: { toId: player.id } });
        if (other.cash === 0 && e.amount > give) {
          state.debt = { playerId: other.id, creditorId: player.id, amount: e.amount - give };
          state.phase = 'debt';
        }
      }
      player.cash += total;
      out.events.push({ type: 'cashChange', playerId: player.id, amount: total });
      return 'none';
    }
    case 'payEach': {
      const totalDue = e.amount * state.players.filter((p) => !p.bankrupt && p.id !== player.id).length;
      if (player.cash < totalDue) {
        state.debt = { playerId: player.id, creditorId: null, amount: totalDue - player.cash };
        state.phase = 'debt';
        player.cash = 0;
        return 'debt';
      }
      for (const other of state.players) {
        if (other.id === player.id || other.bankrupt) continue;
        player.cash -= e.amount;
        other.cash += e.amount;
        out.events.push({ type: 'cashChange', playerId: other.id, amount: e.amount, meta: { fromId: player.id } });
      }
      out.events.push({ type: 'cashChange', playerId: player.id, amount: -totalDue });
      return 'none';
    }
    case 'repairs': {
      let total = 0;
      state.spaces.forEach((ss, i) => {
        if (ss.ownerId !== player.id) return;
        if (ss.houses === 5) total += e.perHotel;
        else total += ss.houses * e.perHouse;
      });
      if (total > 0) {
        if (player.cash < total) {
          state.debt = { playerId: player.id, creditorId: null, amount: total - player.cash };
          state.phase = 'debt';
          player.cash = 0;
          return 'debt';
        }
        player.cash -= total;
        out.events.push({ type: 'cashChange', playerId: player.id, amount: -total });
      }
      return 'none';
    }
    case 'jail': {
      return 'none';
    }
    case 'goToJail': {
      player.inJail = true;
      player.jailTurns = 0;
      player.position = 10;
      out.events.push({ type: 'jailEnter', playerId: player.id, spaceId: 10 });
      return 'gotojail';
    }
    case 'jailFree': {
      player.getOutOfJailCards += 1;
      // held out of circulation until used
      return 'none';
    }
    default:
      return 'none';
  }
}

export function cardById(id: string): CardData | undefined {
  return CARDS_BY_ID[id] ?? CARDS.find((c) => c.id === id);
}

export function playerHoldsJailCard(state: GameState, playerId: string): boolean {
  return (playerById(state, playerId)?.getOutOfJailCards ?? 0) > 0;
}
