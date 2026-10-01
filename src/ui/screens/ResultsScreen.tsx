'use client';

/**
 * Results — victory/bankruptcy screen with confetti, per-player stats and a
 * net-worth-over-time chart (pure SVG).
 */
import { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { audio } from '../../audio/audioEngine';
import { t, useLang } from '../../i18n';
import { CharacterPortrait } from '../../art/characters/Characters';
import { Trophy, Confetti } from '../../art/props/Props';
import { BOARD } from '../../data/board';
import type { GameState } from '../../engines/types';

export function ResultsScreen(): ReactNode {
  useLang();
  const state = useGameStore((s) => s.state);
  const localPlayerId = useGameStore((s) => s.localPlayerId ?? 'p0');
  const setScreen = useGameStore((s) => s.setScreen);
  const newOfflineGame = useGameStore((s) => s.newOfflineGame);
  if (!state) return null;

  const winner = state.players.find((p) => p.id === state.winnerId);
  const meWon = state.winnerId === localPlayerId;
  const ranked = [...state.players].sort((a, b) => {
    if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
    return netWorthOf(state, b.id) - netWorthOf(state, a.id);
  });

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col px-4 py-6">
      {meWon && <Confetti pieces={36} seed={7} />}

      <div className="relative z-10 flex flex-col items-center pt-4">
        {winner && (
          <>
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="relative">
              <CharacterPortrait characterId={winner.characterId} emotion="winner" size={110} className="drop-shadow-2xl" />
              <div className="absolute -right-6 -top-4 ec-anim-bob">
                <Trophy size={52} />
              </div>
            </motion.div>
            <h1 className="mt-3 text-3xl font-black">
              {meWon ? `🏆 ${t('game.youWin')}` : t('game.winner', { name: winner.name })}
            </h1>
            <p className="text-sm font-bold text-[var(--ec-ink-soft)]">
              {state.turn} {t('setup.rules.turns', { n: '' }).replace('0', `${state.turn}`)}
              {' · '}${netWorthOf(state, winner.id).toLocaleString()}
            </p>
          </>
        )}
        {!meWon && winner && (
          <p className="mt-1 text-sm font-bold text-[var(--ec-bad)]">{t('game.youLost')}</p>
        )}
      </div>

      {/* ranking */}
      <div className="z-10 mt-5 space-y-2">
        {ranked.map((p, i) => {
          const stats = state.stats;
          return (
            <div key={p.id} className="flex items-center gap-2.5 rounded-2xl bg-[var(--ec-surface)] p-2.5 shadow-sm">
              <span className="w-6 text-center text-lg font-black text-[var(--ec-ink-soft)]">{i + 1}</span>
              <CharacterPortrait characterId={p.characterId} emotion={p.bankrupt ? 'bankrupt' : state.winnerId === p.id ? 'winner' : 'sad'} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black">
                  {p.name}{p.id === localPlayerId && p.name !== t('common.you') && <span className="text-xs text-[var(--ec-ink-soft)]"> ({t('common.you')})</span>}
                </div>
                <div className="text-xs font-bold text-[var(--ec-ink-soft)]">
                  {t('stats.rentCollected')}: ${(stats.rentCollected[p.id] ?? 0).toLocaleString()} · {t('stats.props')}: {state.spaces.filter((ss) => ss.ownerId === p.id).length}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-black ${p.bankrupt ? 'text-[var(--ec-bad)]' : 'text-[var(--ec-good)]'}`}>
                  {p.bankrupt ? '💀' : `$${netWorthOf(state, p.id).toLocaleString()}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* net worth chart */}
      <div className="z-10 mt-4 rounded-2xl bg-[var(--ec-surface)] p-3 shadow-sm">
        <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--ec-ink-soft)]">📈 {t('stats.netWorthChart')}</h2>
        <NetWorthChart state={state} />
      </div>

      <div className="z-10 mt-auto flex gap-2 pt-4">
        <button className="ec-btn ec-btn-ghost flex-1" onClick={() => { audio.play('click'); setScreen('menu'); }}>
          {t('menu.back')}
        </button>
        <button className="ec-btn ec-btn-primary flex-1" onClick={() => { audio.play('buy'); newOfflineGame(
          state.players.map((p, i) => ({
            name: p.name, characterId: p.characterId, color: p.color, isBot: p.isBot,
            botDifficulty: p.botDifficulty, botPersonality: p.botPersonality,
          })), state.settings
        ); }}>
          🎲 {t('game.rematch')}
        </button>
      </div>
    </div>
  );
}

function netWorthOf(state: GameState, playerId: string): number {
  const p = state.players.find((pl) => pl.id === playerId)!;
  return p.cash + state.spaces.reduce((acc, ss, i) => {
    if (ss.ownerId !== playerId) return acc;
    const d = BOARD[i];
    return acc + (ss.mortgaged ? 0 : (d.mortgageValue ?? 0)) + (d.type === 'street' ? (ss.houses === 5 ? 5 : ss.houses) * Math.floor((d.houseCost ?? 0) / 2) : 0);
  }, 0);
}

function NetWorthChart({ state }: { state: GameState }): ReactNode {
  const hist = useMemo(() => state.stats.netWorthHistory.slice(-120), [state.stats.netWorthHistory]);
  if (hist.length < 2) return <p className="py-3 text-center text-xs text-[var(--ec-ink-soft)]">…</p>;

  const players = state.players.filter((p) => !p.bankrupt || netWorthOf(state, p.id) > 0);
  const maxV = Math.max(...hist.flatMap((h) => Object.values(h.values)), 1);
  const W = 300, H = 90;
  const colors = ['#2E86AB', '#E4572E', '#4A9E5C', '#D86FA4', '#F2B33D', '#6B4FA0'];

  const lines = players.map((p, pi) => {
    const pts = hist.map((h, i) => {
      const x = (i / (hist.length - 1)) * W;
      const y = H - ((h.values[p.id] ?? 0) / maxV) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return <polyline key={p.id} points={pts} fill="none" stroke={colors[pi % 6]} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Net worth chart">
      <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" strokeWidth={1} />
      {lines}
    </svg>
  );
}
