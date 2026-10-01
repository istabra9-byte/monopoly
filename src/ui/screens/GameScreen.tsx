'use client';

/**
 * GameScreen — the live game: HUD (portraits + cash + emotions), responsive
 * board, thumb-first action bar, and all interaction sheets.
 */
import { ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, currentEmotion } from '../../state/gameStore';
import { audio, eventToSfx } from '../../audio/audioEngine';
import { t, useLang } from '../../i18n';
import { GameBoard } from '../components/GameBoard';
import { CharacterPortrait } from '../../art/characters/Characters';
import type { Emotion } from '../../art/characters/Characters';
import { BoardSheet, PropertySheet, AssetsSheet, TradeSheet, AuctionSheet, CardSheet, LogSheet, TradeBuilderSheet, IncomingTradeSheet } from './sheets/Sheets';
import { BOARD } from '../../data/board';
import type { GameEvent } from '../../engines/types';

export function GameScreen(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const sheet = useGameStore((s) => s.sheet);
  const openSheet = useGameStore((s) => s.openSheet);
  const selectSpace = useGameStore((s) => s.selectSpace);
  const selectedSpaceId = useGameStore((s) => s.selectedSpaceId);
  const moveAnim = useGameStore((s) => s.moveAnim);
  const lastDice = useGameStore((s) => s.lastDice);
  const fx = useGameStore((s) => s.fx);
  const setScreen = useGameStore((s) => s.setScreen);
  const fxRef = useRef(0);

  // ── FX pipeline: engine events → sound / haptics / card reveal ──
  useEffect(() => {
    for (const item of fx) {
      if (item.id <= fxRef.current) continue;
      fxRef.current = item.id;
      const e = item.event;
      const { sfx, vibe } = eventToSfx(e);
      if (sfx) audio.play(sfx);
      if (vibe) audio.vibrate(vibe);
      if (e.type === 'cardDrawn') {
        useGameStore.setState({ pendingSpaceView: null });
        openSheet('card');
      }
      if (e.type === 'gameOver') {
        setTimeout(() => setScreen('results'), 1400);
      }
    }
  }, [fx, openSheet, setScreen]);

  // Auto-open the auction sheet whenever an auction is running
  const auctionActive = !!state?.pendingAuction;
  useEffect(() => {
    if (auctionActive) openSheet('auction');
    else if (sheet === 'auction') openSheet(null);
  }, [auctionActive, sheet, openSheet]);

  // Results routing on game over
  useEffect(() => {
    if (state?.phase === 'game-over') {
      const timer = setTimeout(() => setScreen('results'), 1600);
      return () => clearTimeout(timer);
    }
  }, [state?.phase, setScreen]);

  if (!state) return null;

  const me = state.players.find((p) => p.id === localPlayerId) ?? state.players[0];
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === me.id && !me.isBot;
  const current = state.players[state.currentPlayerIndex];
  const emotionOf = (pid: string): Emotion => currentEmotion(state, pid);

  // ── Action area content ──
  let actions: ReactNode;
  if (state.phase === 'game-over') {
    actions = <span className="text-sm font-bold text-[var(--ec-ink-soft)]">{t('game.winner', { name: state.players.find((p) => p.id === state.winnerId)?.name ?? '' })}</span>;
  } else if (state.phase === 'buy-decision' && isMyTurn) {
    const spaceData = BOARD[me.position];
    const canAfford = me.cash >= (spaceData.price ?? Infinity);
    actions = (
      <>
        <button className="ec-btn ec-btn-good flex-1" disabled={!canAfford} onClick={() => dispatch({ type: 'BUY_PROPERTY', playerId: me.id })}>
          {t('game.buy', { price: spaceData.price ?? 0 })}
        </button>
        <button className="ec-btn ec-btn-ghost flex-1" onClick={() => dispatch({ type: 'DECLINE_BUY', playerId: me.id })}>
          {t('game.auction')}
        </button>
      </>
    );
  } else if (state.phase === 'debt' && state.debt?.playerId === me.id) {
    actions = (
      <>
        <button className="ec-btn ec-btn-bad flex-1" onClick={() => { openSheet('assets'); }}>
          {t('game.debt', { amount: state.debt.amount })}
        </button>
        <button className="ec-btn ec-btn-ghost" onClick={() => dispatch({ type: 'DECLARE_BANKRUPTCY', playerId: me.id })}>
          {t('game.bankrupt')}
        </button>
      </>
    );
  } else if (isMyTurn && me.inJail && state.phase === 'roll') {
    actions = (
      <>
        {me.getOutOfJailCards > 0 && (
          <button className="ec-btn ec-btn-gold flex-1" onClick={() => dispatch({ type: 'USE_JAIL_CARD', playerId: me.id })}>
            🎟️ {t('game.useCard')}
          </button>
        )}
        <button className="ec-btn ec-btn-ghost flex-1" onClick={() => dispatch({ type: 'PAY_JAIL_FINE', playerId: me.id })}>
          {t('game.payFine', { fine: state.settings.jailFine })}
        </button>
        <button className="ec-btn ec-btn-primary flex-1" onClick={() => dispatch({ type: 'ROLL_DICE', playerId: me.id })}>
          🎲 {t('game.rollTry')}
        </button>
      </>
    );
  } else if (isMyTurn && state.phase === 'roll') {
    actions = (
      <button className="ec-btn ec-btn-primary w-full text-lg ec-turn-pulse" onClick={() => dispatch({ type: 'ROLL_DICE', playerId: me.id })}>
        🎲 {t('game.roll')}
      </button>
    );
  } else if (isMyTurn && state.phase === 'awaiting-end') {
    actions = (
      <>
        <button className="ec-btn ec-btn-ghost" onClick={() => openSheet('assets')} aria-label={t('game.assets')}>
          🏠
        </button>
        <button className="ec-btn ec-btn-ghost" onClick={() => openSheet('trade-new')} aria-label={t('game.trade')}>
          🤝
        </button>
        <button className="ec-btn ec-btn-primary flex-1" onClick={() => dispatch({ type: 'END_TURN', playerId: me.id })}>
          {t('game.endTurn')}
          {state.extraTurn && <span className="text-xs">· {t('game.doubles')}</span>}
        </button>
      </>
    );
  } else {
    const waitingName = state.phase === 'auction' ? undefined : current?.name;
    actions = (
      <div className="flex w-full items-center justify-center gap-2 text-sm font-bold text-[var(--ec-ink-soft)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--ec-gold)]" />
        {waitingName ? t('game.waiting', { name: waitingName }) : t('sheet.auction.title')}
      </div>
    );
  }

  const statusBar = state.dice && state.phase !== 'game-over' && (
    <span className="ec-chip">{state.dice.d1 + state.dice.d2}{state.dice.isDouble ? ' ·double' : ''}</span>
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* ── HUD ── */}
      <header className="z-40 flex items-center gap-2 px-3 pt-2">
        <button className="ec-btn ec-btn-ghost min-h-10 w-10 !px-0" onClick={() => openSheet('menu')} aria-label={t('game.menu')}>
          ☰
        </button>
        <PlayerBadge
          player={me}
          emotion={emotionOf(me.id)}
          active={state.players[state.currentPlayerIndex]?.id === me.id}
          isMe
        />
        <div className="flex flex-1 gap-1.5 overflow-x-auto ec-scroll py-1">
          {state.players.filter((p) => p.id !== me.id).map((p) => (
            <PlayerBadge key={p.id} player={p} emotion={emotionOf(p.id)} active={state.players[state.currentPlayerIndex]?.id === p.id} compact />
          ))}
        </div>
        {statusBar}
      </header>

      {/* floats over board */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-1">
        <FloatLayer />
        <GameBoard
          state={state}
          theme={state.settings.theme}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={(id) => {
            selectSpace(id);
            audio.play('click');
            openSheet('property');
          }}
          moveAnim={moveAnim}
        />
        {lastDice && state.dice?.isDouble && isMyTurn && state.phase === 'roll' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute top-1 rounded-full bg-[var(--ec-gold)] px-3 py-1 text-xs font-black text-[#5e3a06] shadow">
            {t('game.doubles')}
          </motion.div>
        )}
      </div>

      {/* ── action bar ── */}
      <footer className="z-40 px-3 pb-2 pt-1">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-3xl bg-[var(--ec-surface)]/90 p-2 shadow-[0_6px_24px_rgba(20,20,40,0.18)] backdrop-blur">
          {actions}
        </div>
      </footer>

      {/* ── sheets ── */}
      <AnimatePresence>
        {sheet === 'property' && selectedSpaceId !== null && <BoardSheet key="prop"><PropertySheet spaceId={selectedSpaceId} /></BoardSheet>}
        {sheet === 'assets' && <BoardSheet key="assets"><AssetsSheet /></BoardSheet>}
        {sheet === 'trade' && <BoardSheet key="trade"><TradeSheet /></BoardSheet>}
        {sheet === 'trade-new' && <BoardSheet key="tradeb"><TradeBuilderSheet /></BoardSheet>}
        {sheet === 'auction' && <BoardSheet key="auction"><AuctionSheet /></BoardSheet>}
        {sheet === 'card' && <BoardSheet key="card"><CardSheet /></BoardSheet>}
        {sheet === 'log' && <BoardSheet key="log"><LogSheet /></BoardSheet>}
        {state.phase === 'trade-pending' && state.pendingTrade?.offer.toId === localPlayerId && sheet !== 'card' && (
          <BoardSheet key="incoming"><IncomingTradeSheet /></BoardSheet>
        )}
        {sheet === 'menu' && <BoardSheet key="menu"><GameMenuSheet /></BoardSheet>}
      </AnimatePresence>
    </div>
  );
}

function PlayerBadge({ player, emotion, active, compact, isMe }: {
  player: { id: string; name: string; characterId: string; cash: number; inJail: boolean; bankrupt: boolean; getOutOfJailCards: number };
  emotion: Emotion;
  active: boolean;
  compact?: boolean;
  isMe?: boolean;
}): ReactNode {
  return (
    <motion.button
      layout
      onClick={() => { audio.play('click'); }}
      className={`relative flex shrink-0 items-center gap-1.5 rounded-2xl px-1.5 py-1 shadow-sm transition-all ${active ? 'bg-[var(--ec-surface)] ring-2 ring-[var(--ec-gold)]' : 'bg-[var(--ec-surface)]/70'}`}
      aria-label={`${player.name} $${player.cash}`}
    >
      <div className={emotion === 'happy' || emotion === 'winner' ? 'ec-anim-bounce' : ''}>
        <CharacterPortrait characterId={player.characterId} emotion={player.bankrupt ? 'bankrupt' : emotion} size={compact ? 30 : 40} />
      </div>
      <div className="pr-1 text-left leading-tight">
        <div className={`text-[10px] font-bold text-[var(--ec-ink-soft)] ${compact ? 'max-w-[64px] truncate' : ''}`}>
          {isMe ? t('common.you') : player.name}
          {player.inJail && ' 🔒'}
          {player.getOutOfJailCards > 0 && ' 🎟️'}
        </div>
        <div className={`ec-hud-cash text-[13px] ${player.bankrupt ? 'text-[var(--ec-bad)] line-through' : ''}`}>
          ${player.cash.toLocaleString()}
        </div>
      </div>
    </motion.button>
  );
}

/** Floating +$ / −$ texts, positioned near the board top. */
function FloatLayer(): ReactNode {
  const floats = useGameStore((s) => s.floats);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-40 h-10">
      {floats.map((f) => (
        <span key={f.id} className={`ec-float ec-float-${f.tone}`}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

function GameMenuSheet(): ReactNode {
  const setScreen = useGameStore((s) => s.setScreen);
  const openSheet = useGameStore((s) => s.openSheet);
  const quitGame = useGameStore((s) => s.quitGame);
  const items: Array<[string, string, () => void]> = [
    [t('game.log'), '📜', () => openSheet('log')],
    [t('sheet.assets.title'), '🏠', () => openSheet('assets')],
    [t('menu.settings'), '⚙️', () => setScreen('settings')],
    [t('menu.back'), '🚪', () => { quitGame(); }],
  ];
  return (
    <div className="space-y-2 p-4 pb-8">
      <h2 className="mb-2 text-lg font-black">{t('game.menu')}</h2>
      {items.map(([label, icon, fn]) => (
        <button key={label} className="ec-btn ec-btn-sheet w-full justify-start" onClick={fn}>
          <span className="mr-2">{icon}</span> {label}
        </button>
      ))}
    </div>
  );
}

export type { GameEvent };
