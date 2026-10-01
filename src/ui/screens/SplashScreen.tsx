'use client';

/**
 * Splash — premium animated title with character lineup.
 * Any tap unlocks audio and continues to the menu.
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CharacterPortrait } from '../../art/characters/Characters';
import { audio } from '../../audio/audioEngine';
import { useGameStore } from '../../state/gameStore';
import { t } from '../../i18n';

const LINEUP = ['sailor', 'chef', 'pilot', 'detective', 'astronaut', 'artist'];

export function SplashScreen(): ReactNode {
  const setScreen = useGameStore((s) => s.setScreen);

  const start = () => {
    audio.unlock();
    audio.play('click');
    setScreen('menu');
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden px-6 py-10"
      onPointerDown={start}
      role="button"
      aria-label={t('common.tapToStart')}
    >
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="mt-10 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--ec-surface)]/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--ec-ink-soft)] shadow-sm">
          🏙️ {t('app.tagline')}
        </div>
        <h1 className="bg-gradient-to-b from-[#E4572E] via-[#E4572E] to-[#B23A18] bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-sm sm:text-7xl">
          {t('app.name')}
        </h1>
      </motion.div>

      <div className="flex items-end justify-center gap-1 sm:gap-3">
        {LINEUP.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 40, rotate: i % 2 ? 4 : -4 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 3 : -3 }}
            transition={{ delay: 0.25 + i * 0.12, type: 'spring', stiffness: 200, damping: 16 }}
            className={i % 2 ? 'ec-anim-bob' : ''}
          >
            <CharacterPortrait characterId={id} emotion={i === 0 ? 'happy' : 'idle'} size={i === 0 ? 96 : 72} className="drop-shadow-xl" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1, duration: 1.6, repeat: Infinity }}
        className="mb-8 rounded-full bg-[var(--ec-brand)] px-8 py-3 text-base font-extrabold text-white shadow-lg"
      >
        {t('common.tapToStart')}
      </motion.div>
    </div>
  );
}
