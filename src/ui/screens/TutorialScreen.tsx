'use client';

/**
 * Tutorial — interactive swipe-through of the core rules with illustrations.
 */
import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { audio } from '../../audio/audioEngine';
import { t, useLang } from '../../i18n';
import { CharacterPortrait } from '../../art/characters/Characters';
import { HouseIcon, HotelIcon, DiceFace, Bill } from '../../art/props/Props';
import { Landmark } from '../../art/board/Landmark';

const STEPS = [1, 2, 3, 4, 5, 6] as const;

export function TutorialScreen(): ReactNode {
  useLang();
  const setScreen = useGameStore((s) => s.setScreen);
  const [step, setStep] = useState(0);

  const next = () => {
    audio.play('click');
    if (step < STEPS.length) setStep(step + 1);
    else setScreen('menu');
  };

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col px-6 py-6">
      <header className="flex items-center justify-between py-2">
        <button className="ec-btn ec-btn-ghost min-h-11 px-4 text-sm" onClick={() => { audio.play('click'); setScreen('menu'); }}>
          ← {t('menu.back')}
        </button>
        <h1 className="text-lg font-black">📖 {t('tutorial.title')}</h1>
        <span className="w-16" />
      </header>

      <div className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="ec-card flex flex-col items-center gap-4 p-6 text-center"
          >
            <StepArt step={step} />
            <p className="text-base font-bold leading-relaxed">{t(`tutorial.${STEPS[step]}`)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mb-3 flex justify-center gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[var(--ec-brand)]' : 'w-2 bg-[var(--border)]'}`} />
        ))}
      </div>
      <button className="ec-btn ec-btn-primary w-full" onClick={next}>
        {step < STEPS.length - 1 ? '→' : '✓'} {step < STEPS.length - 1 ? t('common.ok') : t('menu.play')}
      </button>
    </div>
  );
}

function StepArt({ step }: { step: number }): ReactNode {
  switch (step) {
    case 0:
      return (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" width={64} height={64} role="img" aria-label="Dice"><DiceFace n={5} uid="tut-d1" /></svg>
          <svg viewBox="0 0 100 100" width={64} height={64} role="img" aria-label="Dice"><DiceFace n={2} uid="tut-d2" /></svg>
          <CharacterPortrait characterId="racer" emotion="happy" size={72} />
        </div>
      );
    case 1:
      return (
        <div className="relative h-32 w-44 overflow-hidden rounded-2xl">
          <Landmark artKey="lighthouse" district="azure-bay" size="100%" label="Lighthouse Point" />
        </div>
      );
    case 2:
      return (
        <div className="flex items-center gap-2">
          {['old-docks', 'azure-bay', 'crimson-quarter'].map((d, i) => (
            <span key={d} className="flex flex-col items-center gap-1">
              <span className="h-8 w-8 rounded-lg" style={{ background: { 'old-docks': '#7A5230', 'azure-bay': '#4FA8D8', 'crimson-quarter': '#C43B4A' }[d] }} />
              <HouseIcon size={18} pop={i === 2} />
            </span>
          ))}
          <CharacterPortrait characterId="explorer" emotion="happy" size={64} />
        </div>
      );
    case 3:
      return (
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => <HouseIcon key={i} size={20} pop={i === 3} />)}
          </div>
          <HotelIcon size={34} />
        </div>
      );
    case 4:
      return (
        <div className="flex items-center gap-2">
          <Bill value={100} size={40} />
          <Bill value={500} size={40} />
          <CharacterPortrait characterId="knight" emotion="thinking" size={64} />
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <CharacterPortrait characterId="sailor" emotion="winner" size={80} />
          <CharacterPortrait characterId="chef" emotion="bankrupt" size={64} />
        </div>
      );
  }
}
