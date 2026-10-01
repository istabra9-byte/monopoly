import type { SpaceData, DistrictId, CardData } from '../engines/types';

/**
 * Empire City board — 40 spaces, 8 districts, original world.
 * Prices/rents follow the classic property-trading curves.
 */
export const DISTRICTS: Record<
  DistrictId,
  { nameKey: string; banner: string; base: string; accent: string; pattern: 'rope' | 'wave' | 'dots' | 'brick' | 'lantern' | 'rays' | 'leaf' | 'star' }
> = {
  'old-docks':       { nameKey: 'district.oldDocks',       banner: '#7A5230', base: '#A87848', accent: '#E8D5B5', pattern: 'rope' },
  'azure-bay':       { nameKey: 'district.azureBay',       banner: '#4FA8D8', base: '#BFE4F5', accent: '#FFF3D6', pattern: 'wave' },
  'old-town':        { nameKey: 'district.oldTown',        banner: '#D86FA4', base: '#F2C6D8', accent: '#7C4A66', pattern: 'dots' },
  'craft-quarter':   { nameKey: 'district.craftQuarter',   banner: '#E08A2E', base: '#E8B06B', accent: '#6B3A1E', pattern: 'brick' },
  'crimson-quarter': { nameKey: 'district.crimsonQuarter', banner: '#C43B4A', base: '#E86A6A', accent: '#FFD98E', pattern: 'lantern' },
  'sunset-palms':    { nameKey: 'district.sunsetPalms',    banner: '#E8B84A', base: '#F5DFA0', accent: '#4A8C5C', pattern: 'rays' },
  'verdant-heights': { nameKey: 'district.verdantHeights', banner: '#4A9E5C', base: '#A8D8A0', accent: '#F2EFD8', pattern: 'leaf' },
  'imperial-heights':{ nameKey: 'district.imperialHeights',banner: '#4A5FC4', base: '#8C9AE8', accent: '#E8ECFF', pattern: 'star' },
};

const street = (
  id: number, name: string, district: DistrictId,
  price: number, rent: number[], houseCost: number
): SpaceData => ({
  id, type: 'street', name, district, price,
  rent, houseCost, mortgageValue: Math.floor(price / 2),
});

const S = (
  id: number, type: SpaceData['type'], name: string,
  extra: Partial<SpaceData> = {}
): SpaceData => ({ id, type, name, ...extra });

export const BOARD: SpaceData[] = [
  S(0, 'go', 'space.go'),
  // ── Old Docks (brown) ──
  street(1,  'space.harborRow',       'old-docks', 60,  [2, 10, 30, 90, 160, 250], 50),
  S(2, 'chest', 'space.communityChest'),
  street(3,  'space.fishermansWharf', 'old-docks', 60,  [4, 20, 60, 180, 320, 450], 50),
  S(4, 'tax', 'space.incomeTax', { taxAmount: 200 }),
  S(5, 'station', 'space.grandTerminal', { price: 200, mortgageValue: 100 }),
  // ── Azure Bay (light blue) ──
  street(6,  'space.marinaWalk',      'azure-bay', 100, [6, 30, 90, 270, 400, 550], 50),
  S(7, 'chance', 'space.chance'),
  street(8,  'space.lighthousePoint', 'azure-bay', 100, [6, 30, 90, 270, 400, 550], 50),
  street(9,  'space.boardwalkCrescent','azure-bay', 120, [8, 40, 100, 300, 450, 600], 50),
  // ── Old Town (pink) ──
  S(10, 'jail', 'space.jail'),
  street(11, 'space.roseAlley',       'old-town', 140, [10, 50, 150, 450, 625, 750], 100),
  S(12, 'utility', 'space.powerPlant', { price: 150, mortgageValue: 75 }),
  street(13, 'space.clocktowerSquare','old-town', 140, [10, 50, 150, 450, 625, 750], 100),
  street(14, 'space.operaLane',       'old-town', 160, [12, 60, 180, 500, 700, 900], 100),
  S(15, 'station', 'space.centralMetro', { price: 200, mortgageValue: 100 }),
  // ── Craft Quarter (orange) ──
  street(16, 'space.artisanRow',      'craft-quarter', 180, [14, 70, 200, 550, 750, 950], 100),
  S(17, 'chest', 'space.communityChest'),
  street(18, 'space.marketStreet',    'craft-quarter', 180, [14, 70, 200, 550, 750, 950], 100),
  street(19, 'space.glassworksPlaza', 'craft-quarter', 200, [16, 80, 220, 600, 800, 1000], 100),
  S(20, 'freeparking', 'space.freeParking'),
  // ── Crimson Quarter (red) ──
  street(21, 'space.crimsonGate',     'crimson-quarter', 220, [18, 90, 250, 700, 875, 1050], 150),
  S(22, 'chance', 'space.chance'),
  street(23, 'space.emberStreet',     'crimson-quarter', 220, [18, 90, 250, 700, 875, 1050], 150),
  street(24, 'space.dragonBridge',    'crimson-quarter', 240, [20, 100, 300, 750, 925, 1100], 150),
  S(25, 'station', 'space.harborFerry', { price: 200, mortgageValue: 100 }),
  // ── Sunset Palms (yellow) ──
  street(26, 'space.palmPromenade',   'sunset-palms', 260, [22, 110, 330, 800, 975, 1150], 150),
  street(27, 'space.goldenDunes',     'sunset-palms', 260, [22, 110, 330, 800, 975, 1150], 150),
  S(28, 'utility', 'space.waterTower', { price: 150, mortgageValue: 75 }),
  street(29, 'space.solarisTower',    'sunset-palms', 280, [24, 120, 360, 850, 1025, 1200], 150),
  // ── Verdant Heights (green) ──
  S(30, 'gotojail', 'space.goToJail'),
  street(31, 'space.botanicalDome',   'verdant-heights', 300, [26, 130, 390, 900, 1100, 1275], 200),
  street(32, 'space.harborBridge',    'verdant-heights', 300, [26, 130, 390, 900, 1100, 1275], 200),
  S(33, 'chest', 'space.communityChest'),
  street(34, 'space.mountainTemple',  'verdant-heights', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  S(35, 'station', 'space.skylineExpress', { price: 200, mortgageValue: 100 }),
  // ── Imperial Heights (dark blue) ──
  S(36, 'chance', 'space.chance'),
  street(37, 'space.observatory',     'imperial-heights', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  S(38, 'tax', 'space.luxuryTax', { taxAmount: 100 }),
  street(39, 'space.imperialPalace',  'imperial-heights', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

export const SPACES_BY_ID = BOARD; // index === id

/** Landmark illustration key per space (art system routing). */
export const SPACE_ART: Record<number, string> = {
  0: 'startgate', 1: 'harborrow', 2: 'chest', 3: 'wharf', 4: 'taxoffice',
  5: 'train', 6: 'marina', 7: 'orb', 8: 'lighthouse', 9: 'boardwalk',
  10: 'jail', 11: 'rosealley', 12: 'powerplant', 13: 'clocktower', 14: 'opera',
  15: 'metro', 16: 'artisan', 17: 'chest', 18: 'market', 19: 'glassworks',
  20: 'garden', 21: 'crimsongate', 22: 'orb', 23: 'ember', 24: 'dragonbridge',
  25: 'ferry', 26: 'palms', 27: 'dunes', 28: 'watertower', 29: 'solaris',
  30: 'patrol', 31: 'dome', 32: 'bridge', 33: 'chest', 34: 'temple',
  35: 'cablecar', 36: 'orb', 37: 'observatory', 38: 'jewel', 39: 'palace',
};

/**
 * Cards — 16 Chance + 16 Community Chest, classic effect set.
 * Space references use Empire City ids:
 *  stations: 5,15,25,35 · utilities: 12,28
 *  named moves: 39 Imperial Palace, 24 Dragon Bridge, 11 Rose Alley, 35 Skyline Express
 */
export const CARDS: CardData[] = [
  // Chance
  { id: 'c1',  deck: 'chance', titleKey: 'card.chance.advancePalace', effect: { kind: 'moveTo', space: 39 } },
  { id: 'c2',  deck: 'chance', titleKey: 'card.chance.advanceGo', effect: { kind: 'moveTo', space: 0, collectGo: true } },
  { id: 'c3',  deck: 'chance', titleKey: 'card.chance.advanceBridge', effect: { kind: 'moveTo', space: 24 } },
  { id: 'c4',  deck: 'chance', titleKey: 'card.chance.advanceRose', effect: { kind: 'moveTo', space: 11 } },
  { id: 'c5',  deck: 'chance', titleKey: 'card.chance.nearestStation', effect: { kind: 'nearestStation', payDouble: true } },
  { id: 'c6',  deck: 'chance', titleKey: 'card.chance.nearestUtility', effect: { kind: 'nearestUtility' } },
  { id: 'c7',  deck: 'chance', titleKey: 'card.chance.dividend', effect: { kind: 'collect', amount: 50 } },
  { id: 'c8',  deck: 'chance', titleKey: 'card.chance.jailFree', effect: { kind: 'jailFree' } },
  { id: 'c9',  deck: 'chance', titleKey: 'card.chance.back3', effect: { kind: 'moveBack', spaces: 3 } },
  { id: 'c10', deck: 'chance', titleKey: 'card.chance.goToJail', effect: { kind: 'goToJail' } },
  { id: 'c11', deck: 'chance', titleKey: 'card.chance.repairs', effect: { kind: 'repairs', perHouse: 25, perHotel: 100 } },
  { id: 'c12', deck: 'chance', titleKey: 'card.chance.speeding', effect: { kind: 'pay', amount: 15 } },
  { id: 'c13', deck: 'chance', titleKey: 'card.chance.rideExpress', effect: { kind: 'moveTo', space: 35 } },
  { id: 'c14', deck: 'chance', titleKey: 'card.chance.walkPalace', effect: { kind: 'moveTo', space: 39 } },
  { id: 'c15', deck: 'chance', titleKey: 'card.chance.chairman', effect: { kind: 'payEach', amount: 50 } },
  { id: 'c16', deck: 'chance', titleKey: 'card.chance.loan', effect: { kind: 'collect', amount: 150 } },
  // Community Chest
  { id: 'h1',  deck: 'chest', titleKey: 'card.chest.advanceGo', effect: { kind: 'moveTo', space: 0, collectGo: true } },
  { id: 'h2',  deck: 'chest', titleKey: 'card.chest.bankError', effect: { kind: 'collect', amount: 200 } },
  { id: 'h3',  deck: 'chest', titleKey: 'card.chest.doctorFee', effect: { kind: 'pay', amount: 50 } },
  { id: 'h4',  deck: 'chest', titleKey: 'card.chest.stockSale', effect: { kind: 'collect', amount: 50 } },
  { id: 'h5',  deck: 'chest', titleKey: 'card.chest.jailFree', effect: { kind: 'jailFree' } },
  { id: 'h6',  deck: 'chest', titleKey: 'card.chest.goToJail', effect: { kind: 'goToJail' } },
  { id: 'h7',  deck: 'chest', titleKey: 'card.chest.holiday', effect: { kind: 'collect', amount: 100 } },
  { id: 'h8',  deck: 'chest', titleKey: 'card.chest.taxRefund', effect: { kind: 'collect', amount: 20 } },
  { id: 'h9',  deck: 'chest', titleKey: 'card.chest.birthday', effect: { kind: 'collectFromEach', amount: 10 } },
  { id: 'h10', deck: 'chest', titleKey: 'card.chest.insurance', effect: { kind: 'collect', amount: 100 } },
  { id: 'h11', deck: 'chest', titleKey: 'card.chest.hospital', effect: { kind: 'pay', amount: 100 } },
  { id: 'h12', deck: 'chest', titleKey: 'card.chest.school', effect: { kind: 'pay', amount: 50 } },
  { id: 'h13', deck: 'chest', titleKey: 'card.chest.consultancy', effect: { kind: 'collect', amount: 25 } },
  { id: 'h14', deck: 'chest', titleKey: 'card.chest.streetRepairs', effect: { kind: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 'h15', deck: 'chest', titleKey: 'card.chest.beautyContest', effect: { kind: 'collect', amount: 10 } },
  { id: 'h16', deck: 'chest', titleKey: 'card.chest.inherit', effect: { kind: 'collect', amount: 100 } },
];

export const CARDS_BY_ID: Record<string, CardData> = Object.fromEntries(
  CARDS.map((c) => [c.id, c])
);

/** 12 original characters — silhouettes, accents and personalities. */
export const CHARACTERS = [
  { id: 'sailor',    nameKey: 'char.sailor',    color: '#2E86AB', colorDark: '#1D5F7E', skin: '#F2C49B', hair: '#4A3728', personality: 'trader',     blurbKey: 'char.sailor.blurb' },
  { id: 'chef',      nameKey: 'char.chef',      color: '#E4572E', colorDark: '#B23A18', skin: '#E8B48A', hair: '#2E2117', personality: 'aggressive', blurbKey: 'char.chef.blurb' },
  { id: 'pilot',     nameKey: 'char.pilot',     color: '#5A7D9A', colorDark: '#3D5A73', skin: '#C68E5A', hair: '#1A1A1A', personality: 'balanced',   blurbKey: 'char.pilot.blurb' },
  { id: 'detective', nameKey: 'char.detective', color: '#7C5CFF', colorDark: '#5A3FD1', skin: '#F2C49B', hair: '#3A2E20', personality: 'cautious',   blurbKey: 'char.detective.blurb' },
  { id: 'astronaut', nameKey: 'char.astronaut', color: '#F2B33D', colorDark: '#C08A1E', skin: '#8C5A3C', hair: '#101010', personality: 'balanced',   blurbKey: 'char.astronaut.blurb' },
  { id: 'artist',    nameKey: 'char.artist',    color: '#D86FA4', colorDark: '#A84A7C', skin: '#F5D0A8', hair: '#C43B4A', personality: 'trader',     blurbKey: 'char.artist.blurb' },
  { id: 'explorer',  nameKey: 'char.explorer',  color: '#4A9E5C', colorDark: '#337A43', skin: '#B87A4E', hair: '#2E2117', personality: 'aggressive', blurbKey: 'char.explorer.blurb' },
  { id: 'racer',     nameKey: 'char.racer',     color: '#C43B4A', colorDark: '#922834', skin: '#F2C49B', hair: '#6B4A2E', personality: 'aggressive', blurbKey: 'char.racer.blurb' },
  { id: 'inventor',  nameKey: 'char.inventor',  color: '#8A9BA8', colorDark: '#5E7080', skin: '#E8C39E', hair: '#B8B8C4', personality: 'trader',     blurbKey: 'char.inventor.blurb' },
  { id: 'knight',    nameKey: 'char.knight',    color: '#9AA5B1', colorDark: '#6E7A87', skin: '#D9A066', hair: '#4A3728', personality: 'cautious',   blurbKey: 'char.knight.blurb' },
  { id: 'pirate',    nameKey: 'char.pirate',    color: '#2C6E63', colorDark: '#1D4E46', skin: '#C68E5A', hair: '#1A1A1A', personality: 'aggressive', blurbKey: 'char.pirate.blurb' },
  { id: 'magician',  nameKey: 'char.magician',  color: '#6B4FA0', colorDark: '#4C3678', skin: '#F2C49B', hair: '#2E2438', personality: 'cautious',   blurbKey: 'char.magician.blurb' },
] as const;
