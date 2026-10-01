'use client';

/**
 * Main menu — mode selection with resume support.
 */
import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { audio } from '../../audio/audioEngine';
import { t } from '../../i18n';
import { CharacterPortrait } from '../../art/characters/Characters';
import { loadLatestSave } from '../../save/saveEngine';

export function MenuScreen(): ReactNode {
  const setScreen = useGameStore((s) => s.setScreen);
  const quitGame = useGameStore((s) => s.quitGame);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    quitGame();
    void loadLatestSave().then((s) => setHasSave(!!s));
  }, [quitGame]);

  const go = (screen: 'setup' | 'join' | 'joinlan' | 'tutorial' | 'settings') => {
    audio.play('click');
    audio.vibrate(10);
    setScreen(screen);
  };

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col justify-center gap-3 px-6 py-8">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--ec-brand)]">{t('app.name')}</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--ec-ink-soft)]">{t('app.tagline')}</p>
      </div>

      {hasSave && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ec-btn ec-btn-gold w-full"
          onClick={() => { audio.play('click'); setScreen('game'); void resumeGame(); }}
        >
          ▶ {t('menu.resume')}
        </motion.button>
      )}

      <MenuButton label={`🤖 ${t('menu.offline')}`} sub="1–6" onClick={() => go('setup')} primary />
      <MenuButton label={`📶 ${t('menu.lan')}`} sub="2–6 · Wi-Fi" onClick={() => go('joinlan')} />
      <MenuButton label={`🌐 ${t('menu.online')}`} sub="2–6 · Firebase" onClick={() => go('join')} />
      <div className="mt-2 grid grid-cols-2 gap-3">
        <MenuButton label={`❓ ${t('menu.tutorial')}`} onClick={() => go('tutorial')} small />
        <MenuButton label={`⚙️ ${t('menu.settings')}`} onClick={() => go('settings')} small />
      </div>

      <div className="mt-6 flex items-center justify-center gap-1">
        {['sailor', 'chef', 'detective', 'astronaut', 'pirate', 'magician'].map((id, i) => (
          <span key={id} className="ec-anim-bob" style={{ animationDelay: `${i * 0.3}s` }}>
            <CharacterPortrait characterId={id} emotion="idle" size={40} />
          </span>
        ))}
      </div>
    </div>
  );
}

function MenuButton({ label, sub, onClick, primary, small }: { label: string; sub?: string; onClick: () => void; primary?: boolean; small?: boolean }): ReactNode {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`ec-btn w-full ${primary ? 'ec-btn-primary' : 'ec-btn-ghost'} ${small ? 'min-h-11 text-sm' : ''}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {sub && <span className="text-xs font-bold opacity-60">{sub}</span>}
    </motion.button>
  );
}

async function resumeGame(): Promise<void> {
  const { loadLatestSave } = await import('../../save/saveEngine');
  const { useGameStore } = await import('../../state/gameStore');
  const saved = await loadLatestSave();
  if (saved) {
    useGameStore.getState().loadGameState(saved.state, { mode: saved.mode ?? 'offline', isHost: true, localPlayerId: saved.localPlayerId ?? 'p0' });
    useGameStore.getState().setScreen('game');
  }
}
