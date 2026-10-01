'use client';

/**
 * Board — responsive 11×11 grid of illustrated tiles with pawns, houses,
 * dice overlay. Fits any viewport; upright tile faces; banners face center.
 */
import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Landmark } from '../../art/board/Landmark';
import { Pawn } from '../../art/characters/Characters';
import { HouseIcon, HotelIcon, MortgageStamp, DiceFace, OwnerFlag } from '../../art/props/Props';
import { BoardCenter } from '../../art/props/Themes';
import { BOARD, DISTRICTS, SPACE_ART } from '../../data/board';
import type { GameState, SpaceState } from '../../engines/types';
import type { ThemeId, ThemeDef } from '../../art/props/Themes';
import { THEMES } from '../../art/props/Themes';
import { t as tr } from '../../i18n';
import { useGameStore } from '../../state/gameStore';

const GRID = '1.4fr repeat(9, 1fr) 1.4fr';

/** Classic board path: 0=bottom-right corner, counter-clockwise. */
export function tileGeometry(id: number): { row: number; col: number } {
  if (id === 0) return { row: 10, col: 10 };
  if (id < 10) return { row: 10, col: 10 - id };
  if (id === 10) return { row: 10, col: 0 };
  if (id < 20) return { row: 20 - id, col: 0 };
  if (id === 20) return { row: 0, col: 0 };
  if (id < 30) return { row: 0, col: id - 20 };
  if (id === 30) return { row: 0, col: 10 };
  if (id < 40) return { row: id - 30, col: 10 };
  return { row: 10, col: 10 };
}

function bannerSide(id: number): 'top' | 'bottom' | 'left' | 'right' {
  if (id >= 1 && id <= 9) return 'top';
  if (id >= 11 && id <= 19) return 'right';
  if (id >= 21 && id <= 29) return 'bottom';
  if (id >= 31 && id <= 39) return 'left';
  return 'top';
}

const PLAYER_COLORS = ['#2E86AB', '#E4572E', '#4A9E5C', '#D86FA4', '#F2B33D', '#6B4FA0'];

interface TileStyle {
  priceStyle: React.CSSProperties;
  housesStyle: React.CSSProperties;
}

function tilePlacement(id: number): TileStyle {
  const side = bannerSide(id);
  const horizontal = side === 'top' || side === 'bottom';
  return {
    priceStyle: horizontal
      ? {
          left: '50%', transform: 'translateX(-50%)',
          ...(side === 'top' ? { bottom: '7%' } : { top: '7%' }),
        }
      : {
          top: '50%', transform: 'translateY(-50%)',
          ...(side === 'left' ? { right: '8%' } : { left: '8%' }),
        },
    housesStyle: horizontal
      ? { left: 0, right: 0, flexDirection: 'row', ...(side === 'top' ? { top: '3%' } : { bottom: '3%' }) }
      : { top: 0, bottom: 0, flexDirection: 'column', ...(side === 'left' ? { left: '4%' } : { right: '4%' }) },
  };
}

function Tile({
  id, ss, theme, selected, onSelect, playersHere,
}: {
  id: number;
  ss: SpaceState;
  theme: ThemeId;
  selected: boolean;
  onSelect: (id: number) => void;
  playersHere: number;
}) {
  const data = BOARD[id];
  const isCorner = id % 10 === 0;
  const { priceStyle, housesStyle } = tilePlacement(id);
  const hasBuildings = ss.houses > 0;

  return (
    <button
      type="button"
      aria-label={tr(data.name)}
      onClick={() => onSelect(id)}
      className={`relative overflow-hidden rounded-[10%] outline-offset-[-2px] ec-tile focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${selected ? 'z-20 ring-2 ring-[var(--focus)]' : ''}`}
      style={{
        gridRow: tileGeometry(id).row + 1,
        gridColumn: tileGeometry(id).col + 1,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 1px 3px rgba(20,20,40,0.25)',
        touchAction: 'manipulation',
      }}
    >
      <Landmark
        artKey={SPACE_ART[id]}
        district={data.district}
        theme={theme}
        size="100%"
        className="absolute inset-0"
        label=""
      />
      {!isCorner && data.price ? (
        <span className="absolute z-10 text-[min(1.8vw,10px)] font-bold leading-none ec-price" style={{ ...priceStyle, color: '#4A4560' }}>
          ${data.price}
        </span>
      ) : null}
      {ss.ownerId !== null && (
        <span className="absolute right-[5%] top-[5%] z-10 ec-owner-flag">
          <OwnerFlag color={PLAYER_COLORS[parseInt(ss.ownerId.slice(1), 10) % 6] ?? '#2E86AB'} size={11} />
        </span>
      )}
      {hasBuildings && (
        <span className="absolute z-10 flex items-end justify-center gap-[2%] ec-houses" style={housesStyle}>
          {ss.houses === 5
            ? <HotelIcon size={14} pop label="Hotel" />
            : Array.from({ length: ss.houses }, (_, i) => <HouseIcon key={i} size={9} pop label="House" />)}
        </span>
      )}
      {ss.mortgaged && (
        <span className="absolute inset-0 z-10 flex items-center justify-center ec-mortgage">
          <MortgageStamp size={16} />
        </span>
      )}
      {playersHere > 0 && (
        <span className="absolute bottom-[4%] right-[5%] z-10 flex h-[min(3.2vw,17px)] w-[min(3.2vw,17px)] items-center justify-center rounded-full bg-[rgba(38,36,59,0.8)] text-[min(2.3vw,11px)] font-bold text-white">
          {playersHere}
        </span>
      )}
    </button>
  );
}

/** Pawns with step-by-step hop animation (transform-only, GPU-friendly). */
function PawnLayer({ state, moveAnim }: { state: GameState; moveAnim: { playerId: string; path: number[]; key: number } | null }): ReactNode {
  const [override, setOverride] = useState<Record<string, number>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(600);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600;
      setBoardSize(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!moveAnim || moveAnim.path.length === 0) return;
    let cancelled = false;
    const run = async () => {
      for (const step of moveAnim.path) {
        if (cancelled) return;
        setOverride((o) => ({ ...o, [moveAnim.playerId]: step }));
        await new Promise((r) => setTimeout(r, 280));
      }
      if (!cancelled) setOverride((o) => ({ ...o, [moveAnim.playerId]: moveAnim.path[moveAnim.path.length - 1] }));
    };
    void run();
    return () => { cancelled = true; };
  }, [moveAnim?.key]);

  const seats = [
    { x: -0.9, y: -0.8 }, { x: 0.9, y: -0.8 }, { x: -0.9, y: 0.9 },
    { x: 0.9, y: 0.9 }, { x: 0, y: -1.4 }, { x: 0, y: 1.4 },
  ];
  const tile = boardSize / 11;
  const pawnW = tile * 0.72;

  return (
    <div ref={boardRef} className="pointer-events-none absolute inset-0 z-30">
      {state.players.filter((p) => !p.bankrupt).map((p, idx) => {
        const tileId = override[p.id] ?? p.position;
        const geo = tileGeometry(tileId);
        const seat = seats[idx % 6];
        const x = (geo.col + 0.5) * tile - pawnW / 2 + seat.x * tile * 0.12;
        const y = (geo.row + 0.5) * tile - pawnW * 0.86 + seat.y * tile * 0.12;
        return (
          <motion.div
            key={p.id}
            className="absolute left-0 top-0 will-change-transform"
            initial={false}
            animate={{ x, y }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
            style={{ width: pawnW }}
          >
            <Pawn
              characterId={p.characterId}
              size="100%"
              label={`${p.name} pawn`}
              celebration={state.winnerId === p.id}
              className={`drop-shadow-[0_2px_3px_rgba(20,20,40,0.35)] ${state.winnerId === p.id ? 'ec-anim-bounce' : ''}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function DiceLayer(): ReactNode {
  const lastDice = useGameStore((s) => s.lastDice);
  const [doneKey, setDoneKey] = useState(0);

  useEffect(() => {
    if (!lastDice || lastDice.key <= doneKey) return;
    const t1 = setTimeout(() => setDoneKey(lastDice.key), 620);
    return () => clearTimeout(t1);
  }, [lastDice?.key]);

  const rolling = !!lastDice && lastDice.key > doneKey;
  const d1 = rolling ? 1 : lastDice?.d1 ?? 1;
  const d2 = rolling ? 6 : lastDice?.d2 ?? 1;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[5%]" style={{ width: '30%' }}>
      {[d1, d2].map((n, i) => (
        <motion.div
          key={i}
          className="aspect-square w-1/2 drop-shadow-[0_6px_12px_rgba(20,20,40,0.4)]"
          animate={rolling ? { rotate: [0, 360, 700], scale: [1, 1.18, 1], y: [0, -16, 0] } : { rotate: 0, scale: 1, y: 0 }}
          transition={rolling ? { duration: 0.58, ease: 'easeOut' } : { type: 'spring', stiffness: 300, damping: 18 }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={`Die showing ${n}`}>
            <DiceFace n={n} uid={`dice-ov-${i}`} />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

export function GameBoard({
  state, theme, selectedSpaceId, onSelectSpace, moveAnim,
}: {
  state: GameState;
  theme: ThemeId;
  selectedSpaceId: number | null;
  onSelectSpace: (id: number) => void;
  moveAnim: { playerId: string; path: number[]; key: number } | null;
}) {
  const th: ThemeDef = THEMES[theme] ?? THEMES.classic;

  const playersOnTile = useMemo(() => {
    const m: Record<number, number> = {};
    for (const p of state.players) {
      if (!p.bankrupt) m[p.position] = (m[p.position] ?? 0) + 1;
    }
    return m;
  }, [state.players]);

  return (
    <div
      className="relative mx-auto aspect-square w-full select-none rounded-[4%] p-[1.2%] shadow-[0_10px_40px_rgba(20,20,40,0.35)]"
      style={{
        background: th.frameColor,
        maxWidth: 'min(100dvw - 12px, 100dvh - 178px, 680px)',
      }}
    >
      <div
        className="relative grid h-full w-full gap-[0.4%] rounded-[3%] p-[0.7%]"
        style={{ gridTemplateColumns: GRID, gridTemplateRows: GRID, background: th.boardFelt }}
        role="grid"
        aria-label={tr('board.title')}
      >
        {BOARD.map((data) => (
          <Tile
            key={data.id}
            id={data.id}
            ss={state.spaces[data.id]}
            theme={theme}
            selected={selectedSpaceId === data.id}
            onSelect={onSelectSpace}
            playersHere={playersOnTile[data.id] ?? 0}
          />
        ))}
        <div
          className="relative flex items-center justify-center rounded-[3%]"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        >
          <div className="relative h-full w-full p-[7%]">
            <BoardCenter theme={theme} size="100%" />
          </div>
          <DiceLayer />
        </div>
        <PawnLayer key={state.turn} state={state} moveAnim={moveAnim} />
      </div>
    </div>
  );
}
