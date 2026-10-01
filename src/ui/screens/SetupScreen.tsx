'use client';

/**
 * New-game setup — player count, characters, bot difficulty, rules, theme.
 */
import { ReactNode, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { CHARACTERS } from '../../data/board';
import { CharacterPortrait } from '../../art/characters/Characters';
import { audio } from '../../audio/audioEngine';
import { t, useLang } from '../../i18n';
import type { BotDifficulty, GameSettings } from '../../engines/types';
import type { PlayerConfig } from '../../engines/rulesEngine';
import type { ThemeId } from '../../art/props/Themes';

const DEFAULT_COLORS = ['#2E86AB', '#E4572E', '#4A9E5C', '#D86FA4', '#F2B33D', '#6B4FA0'];

export function SetupScreen(): ReactNode {
  useLang();
  const newOfflineGame = useGameStore((s) => s.newOfflineGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const [botCount, setBotCount] = useState(3);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const [myChar, setMyChar] = useState('sailor');
  const [theme, setTheme] = useState<ThemeId>('classic');
  const [rules, setRules] = useState<Partial<GameSettings>>({
    startingCash: 1500, goSalary: 200, auctionsEnabled: true,
    freeParkingJackpot: false, doubleSalaryOnGo: false, evenBuild: true, maxTurns: 150,
  });
  const [showRules, setShowRules] = useState(false);

  const taken = useMemo(() => new Set([myChar]), [myChar]);
  const botChars = useMemo(() => {
    const rest = CHARACTERS.filter((c) => !taken.has(c.id));
    const personalities: Record<BotDifficulty, string[]> = {
      easy: [], normal: [], hard: [],
    };
    void personalities;
    return rest.slice(0, botCount);
  }, [taken, botCount]);

  const start = () => {
    audio.play('buy');
    audio.vibrate([12, 30, 12]);
    const configs: PlayerConfig[] = [
      { name: t('common.you'), characterId: myChar, color: DEFAULT_COLORS[0], isBot: false },
      ...botChars.map((c, i) => ({
        name: t(c.nameKey),
        characterId: c.id,
        color: DEFAULT_COLORS[i + 1],
        isBot: true,
        botDifficulty: difficulty,
        botPersonality: c.personality as 'aggressive' | 'cautious' | 'trader' | 'balanced',
      })),
    ];
    newOfflineGame(configs, { ...rules, theme });
  };

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col px-4 pb-6">
      <header className="flex items-center justify-between py-3">
        <button className="ec-btn ec-btn-ghost min-h-11 px-4 text-sm" onClick={() => { audio.play('click'); setScreen('menu'); }}>
          ← {t('menu.back')}
        </button>
        <h1 className="text-xl font-black">{t('setup.title')}</h1>
        <span className="w-20" />
      </header>

      <div className="ec-scroll flex-1 space-y-5 overflow-y-auto pb-4">
        {/* You */}
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--ec-ink-soft)]">
            {t('setup.you')} · {t('setup.character')}
          </h2>
          <div className="grid grid-cols-6 gap-2">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => { audio.play('click'); setMyChar(c.id); }}
                aria-label={t(c.nameKey)}
                aria-pressed={myChar === c.id}
                className={`relative rounded-2xl p-1 transition-all ${myChar === c.id ? 'ring-[3px] ring-[var(--ec-brand)] bg-[var(--ec-surface)] scale-105' : 'opacity-75'}`}
              >
                <CharacterPortrait characterId={c.id} emotion={myChar === c.id ? 'happy' : 'idle'} size="100%" />
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-xs font-semibold text-[var(--ec-ink-soft)]">
            {t(CHARACTERS.find((c) => c.id === myChar)?.blurbKey ?? '')}
          </p>
        </section>

        {/* Bots */}
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--ec-ink-soft)]">{t('setup.bots')}</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => { audio.play('click'); setBotCount(n); }}
                aria-pressed={botCount === n}
                className={`h-12 flex-1 rounded-2xl text-lg font-black transition-all ${botCount === n ? 'bg-[var(--ec-brand)] text-white shadow-md' : 'ec-btn-sheet'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { audio.play('click'); setDifficulty(d); }}
                aria-pressed={difficulty === d}
                className={`h-11 rounded-2xl text-sm font-extrabold transition-all ${difficulty === d ? 'bg-[var(--ec-ink)] text-[var(--ec-bg)] shadow-md' : 'ec-btn-sheet'}`}
              >
                {t(`setup.difficulty.${d}`)}
              </button>
            ))}
          </div>
          {/* preview bots */}
          <div className="mt-2 flex justify-center gap-1.5">
            {botChars.map((c) => (
              <CharacterPortrait key={c.id} characterId={c.id} emotion="thinking" size={44} />
            ))}
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--ec-ink-soft)]">{t('setup.theme')}</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['classic', 'neon', 'ancient'] as ThemeId[]).map((th) => (
              <button
                key={th}
                onClick={() => { audio.play('click'); setTheme(th); }}
                aria-pressed={theme === th}
                className={`h-16 rounded-2xl text-sm font-extrabold transition-all ${theme === th ? 'ring-[3px] ring-[var(--ec-focus)] scale-[1.02]' : 'opacity-80'}`}
                style={{
                  background: th === 'classic' ? 'linear-gradient(160deg,#2E7D5B,#7A5230)' : th === 'neon' ? 'linear-gradient(160deg,#221A38,#7C5CFF)' : 'linear-gradient(160deg,#B0883E,#6B4A26)',
                  color: '#fff',
                }}
              >
                {t(`theme.${th}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Rules */}
        <section>
          <button className="flex w-full items-center justify-between text-sm font-extrabold uppercase tracking-wide text-[var(--ec-ink-soft)]" onClick={() => setShowRules((v) => !v)}>
            {t('setup.rules')}
            <span>{showRules ? '▲' : '▼'}</span>
          </button>
          {showRules && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-2">
              <RuleRow label={t('setup.rules.startingCash')}>
                <select className="rounded-lg border border-[var(--border)] bg-[var(--ec-surface)] px-2 py-1.5 font-bold" value={rules.startingCash} onChange={(e) => setRules((r) => ({ ...r, startingCash: Number(e.target.value) }))}>
                  {[1000, 1500, 2000, 2500].map((v) => <option key={v} value={v}>${v}</option>)}
                </select>
              </RuleRow>
              <RuleRow label={t('setup.rules.goSalary')}>
                <select className="rounded-lg border border-[var(--border)] bg-[var(--ec-surface)] px-2 py-1.5 font-bold" value={rules.goSalary} onChange={(e) => setRules((r) => ({ ...r, goSalary: Number(e.target.value) }))}>
                  {[100, 200, 300].map((v) => <option key={v} value={v}>${v}</option>)}
                </select>
              </RuleRow>
              <RuleRow label={t('setup.rules.maxTurns')}>
                <select className="rounded-lg border border-[var(--border)] bg-[var(--ec-surface)] px-2 py-1.5 font-bold" value={rules.maxTurns} onChange={(e) => setRules((r) => ({ ...r, maxTurns: Number(e.target.value) }))}>
                  {[80, 150, 250, 0].map((v) => <option key={v} value={v}>{v === 0 ? t('setup.rules.unlimited') : t('setup.rules.turns', { n: v })}</option>)}
                </select>
              </RuleRow>
              <Toggle label={t('setup.rules.auctions')} value={rules.auctionsEnabled ?? true} onChange={(v) => setRules((r) => ({ ...r, auctionsEnabled: v }))} />
              <Toggle label={t('setup.rules.evenBuild')} value={rules.evenBuild ?? true} onChange={(v) => setRules((r) => ({ ...r, evenBuild: v }))} />
              <Toggle label={t('setup.rules.jackpot')} value={rules.freeParkingJackpot ?? false} onChange={(v) => setRules((r) => ({ ...r, freeParkingJackpot: v }))} />
              <Toggle label={t('setup.rules.doubleGo')} value={rules.doubleSalaryOnGo ?? false} onChange={(v) => setRules((r) => ({ ...r, doubleSalaryOnGo: v }))} />
            </motion.div>
          )}
        </section>
      </div>

      <button className="ec-btn ec-btn-primary w-full text-lg" onClick={start}>
        🎲 {t('setup.start')}
      </button>
    </div>
  );
}

function RuleRow({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--ec-surface)] px-3 py-2 text-sm font-bold shadow-sm">
      {label}
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }): ReactNode {
  return (
    <button
      className="flex w-full items-center justify-between rounded-xl bg-[var(--ec-surface)] px-3 py-2.5 text-sm font-bold shadow-sm"
      onClick={() => { audio.play('click'); onChange(!value); }}
      role="switch"
      aria-checked={value}
    >
      {label}
      <span className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-[var(--ec-good)]' : 'bg-[var(--border)]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
