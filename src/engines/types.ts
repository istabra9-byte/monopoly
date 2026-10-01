/**
 * Empire City — core game type system.
 *
 * Everything in this file (and this folder) is PURE TypeScript: no React,
 * no DOM, no I/O. The RulesEngine is a deterministic state machine:
 *   state' = applyAction(state, action, rng)
 * Serialization-friendly (JSON) for save/replay/network snapshot.
 */

// ─── Board ──────────────────────────────────────────────────────────────────

export type SpaceType =
  | 'go'
  | 'street'
  | 'station'
  | 'utility'
  | 'chance'
  | 'chest'
  | 'tax'
  | 'jail'
  | 'gotojail'
  | 'freeparking';

export type DistrictId =
  | 'old-docks'      // brown
  | 'azure-bay'      // light blue
  | 'old-town'       // pink
  | 'craft-quarter'  // orange
  | 'crimson-quarter'// red
  | 'sunset-palms'   // yellow
  | 'verdant-heights'// green
  | 'imperial-heights'; // dark blue

export interface SpaceData {
  id: number;                 // 0..39
  type: SpaceType;
  name: string;               // i18n key suffix
  district?: DistrictId;
  price?: number;             // purchasable price
  rent?: number[];            // [base, 1h, 2h, 3h, 4h, hotel]
  houseCost?: number;         // cost to build one house
  mortgageValue?: number;     // usually price / 2
  taxAmount?: number;         // for tax spaces
}

export interface SpaceState {
  ownerId: string | null;
  houses: number;             // 0..4 (hotel = 5)
  mortgaged: boolean;
}

// ─── Players ────────────────────────────────────────────────────────────────

export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type BotPersonality = 'aggressive' | 'cautious' | 'trader' | 'balanced';

export interface Player {
  id: string;
  name: string;
  characterId: string;        // one of 12 characters
  color: string;              // token/banner color
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  botPersonality?: BotPersonality;
  cash: number;
  position: number;           // 0..39
  inJail: boolean;
  jailTurns: number;          // attempts made while in jail
  getOutOfJailCards: number;
  bankrupt: boolean;
  connected?: boolean;        // multiplayer presence
  uid?: string;               // firebase uid (multiplayer)
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface GameSettings {
  startingCash: number;       // default 1500
  goSalary: number;           // default 200
  doubleSalaryOnGo: boolean;  // land exactly on GO
  freeParkingJackpot: boolean;// taxes pool, off by default
  auctionsEnabled: boolean;   // on decline buy → auction
  evenBuild: boolean;         // enforce even-build rule
  strictMortgage: boolean;    // 10% interest when unmortgaging
  jailFine: number;           // 50
  maxHouses: number;          // 32
  maxHotels: number;          // 12
  turnTimerSec: number;       // 0 = off
  maxTurns: number;           // 0 = unlimited; sudden-death richest wins
  startingDoublesToJail: number; // 3
  theme: 'classic' | 'neon' | 'ancient';
}

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  goSalary: 200,
  doubleSalaryOnGo: false,
  freeParkingJackpot: false,
  auctionsEnabled: true,
  evenBuild: true,
  strictMortgage: true,
  jailFine: 50,
  maxHouses: 32,
  maxHotels: 12,
  turnTimerSec: 0,
  maxTurns: 0,
  startingDoublesToJail: 3,
  theme: 'classic',
};

// ─── Dice ───────────────────────────────────────────────────────────────────

export interface DiceRoll {
  d1: number;
  d2: number;
  isDouble: boolean;
  total: number;
}

// ─── Cards ──────────────────────────────────────────────────────────────────

export type CardEffect =
  | { kind: 'moveTo'; space: number; collectGo?: boolean }
  | { kind: 'moveBack'; spaces: number }
  | { kind: 'nearestStation'; payDouble?: boolean }
  | { kind: 'nearestUtility' }
  | { kind: 'pay'; amount: number }
  | { kind: 'collect'; amount: number }
  | { kind: 'collectFromEach'; amount: number }
  | { kind: 'payEach'; amount: number }
  | { kind: 'repairs'; perHouse: number; perHotel: number }
  | { kind: 'jail' }
  | { kind: 'goToJail' }
  | { kind: 'jailFree' };

export interface CardData {
  id: string;
  deck: 'chance' | 'chest';
  titleKey: string;
  effect: CardEffect;
}

// ─── Auction ────────────────────────────────────────────────────────────────

export interface AuctionState {
  spaceId: number;
  bids: Record<string, number>;   // playerId → current committed bid
  activePlayerId: string | null;
  currentBid: number;
  highestBidderId: string | null;
  passed: string[];
  turnDeadline: number | null;    // epoch ms (host clock)
}

// ─── Trade ──────────────────────────────────────────────────────────────────

export interface TradeOffer {
  fromId: string;
  toId: string;
  giveCash: number;
  getCash: number;
  giveProperties: number[];
  getProperties: number[];
  giveJailCards: number;
  getJailCards: number;
}

// ─── Log & Events ───────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  ts: number;
  playerId?: string;
  key: string;                    // i18n key
  params?: Record<string, string | number>;
}

export type GameEventType =
  | 'diceRolled' | 'pawnMove' | 'pawnTeleport' | 'rentPaid' | 'propertyBought'
  | 'auctionStart' | 'auctionBid' | 'auctionWon' | 'auctionPassed'
  | 'houseBuilt' | 'houseSold' | 'mortgaged' | 'unmortgaged'
  | 'cardDrawn' | 'cashChange' | 'goSalary' | 'jailEnter' | 'jailLeave'
  | 'taxPaid' | 'tradeOffered' | 'tradeAccepted' | 'tradeDeclined'
  | 'bankrupt' | 'turnStart' | 'turnEnd' | 'gameOver' | 'passGo'
  | 'emotion' | 'freeParkingCollect' | 'notEnoughMoney' | 'error';

export interface GameEvent {
  type: GameEventType;
  playerId?: string;
  amount?: number;
  spaceId?: number;
  cardId?: string;
  dice?: DiceRoll;
  emotion?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'ROLL_DICE'; playerId: string }
  | { type: 'BUY_PROPERTY'; playerId: string }
  | { type: 'DECLINE_BUY'; playerId: string }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'BUILD_HOUSE'; playerId: string; spaceId: number }
  | { type: 'SELL_HOUSE'; playerId: string; spaceId: number }
  | { type: 'MORTGAGE'; playerId: string; spaceId: number }
  | { type: 'UNMORTGAGE'; playerId: string; spaceId: number }
  | { type: 'PAY_JAIL_FINE'; playerId: string }
  | { type: 'USE_JAIL_CARD'; playerId: string }
  | { type: 'BID'; playerId: string; amount: number }
  | { type: 'PASS_BID'; playerId: string }
  | { type: 'PROPOSE_TRADE'; playerId: string; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE'; playerId: string }
  | { type: 'DECLINE_TRADE'; playerId: string }
  | { type: 'DECLARE_BANKRUPTCY'; playerId: string }
  | { type: 'BOT_DECIDE'; playerId: string };

// ─── Phase machine ──────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'            // pre-game (multiplayer lobby)
  | 'roll'             // waiting for current player to roll
  | 'moving'           // animation in progress (host still applies instantly)
  | 'resolve'          // space resolution pending decisions (buy / card / rent done)
  | 'buy-decision'     // current player decides buy vs auction
  | 'auction'          // auction in progress
  | 'debt'             // player owes, must liquidate or bankrupt
  | 'awaiting-end'     // turn actions available, waiting END_TURN
  | 'trade-pending'    // a trade offer awaits response
  | 'game-over';

export interface Stats {
  rentCollected: Record<string, number>;
  rentPaid: Record<string, number>;
  propertiesBought: Record<string, number>;
  biggestDeal: { playerId: string; amount: number } | null;
  netWorthHistory: { turn: number; values: Record<string, number> }[];
}

// ─── Root state ─────────────────────────────────────────────────────────────

export interface GameState {
  id: string;
  seed: number;
  rngCounter: number;         // deterministic RNG stream position
  turn: number;               // full turns completed
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  spaces: SpaceState[];       // 40 entries
  chanceDeck: string[];       // shuffled card ids (host-side order)
  chestDeck: string[];
  doublesCount: number;       // consecutive doubles this turn
  extraTurn?: boolean;        // doubles earned another roll
  prevPhase?: GamePhase;      // phase before trade-pending
  tradeCooldownTurn?: number; // last turn a trade was proposed (anti-spam)
  dice: DiceRoll | null;
  pendingAuction: AuctionState | null;
  pendingTrade: { offer: TradeOffer; id: string } | null;
  debt: { playerId: string; creditorId: string | null; amount: number } | null;
  freeParkingPool: number;
  log: LogEntry[];
  logSeq: number;
  settings: GameSettings;
  stats: Stats;
  winnerId: string | null;
  housesLeft: number;         // bank supply
  hotelsLeft: number;
  lastCard: { cardId: string; deck: 'chance' | 'chest' } | null;
}

// ─── Engine result ──────────────────────────────────────────────────────────

export interface ApplyResult {
  state: GameState;           // new immutable state
  events: GameEvent[];        // emitted for UI/audio
  error?: string;             // action rejected if set (state unchanged semantics)
}

// ─── Characters ─────────────────────────────────────────────────────────────

export interface CharacterDef {
  id: string;
  nameKey: string;
  color: string;              // accent
  colorDark: string;
  skin: string;
  hair: string;
  personality: BotPersonality;
  blurbKey: string;
}

// ─── Engine plumbing ────────────────────────────────────────────────────

export interface LogItem {
  key: string;
  params?: Record<string, string | number>;
  playerId?: string;
}

export interface EngineOut {
  events: GameEvent[];
  logs: LogItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const GROUP_COLOR: Record<DistrictId, string> = {
  'old-docks': '#7A5230',
  'azure-bay': '#4FA8D8',
  'old-town': '#D86FA4',
  'craft-quarter': '#E08A2E',
  'crimson-quarter': '#C43B4A',
  'sunset-palms': '#E8B84A',
  'verdant-heights': '#4A9E5C',
  'imperial-heights': '#4A5FC4',
};

export function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}
