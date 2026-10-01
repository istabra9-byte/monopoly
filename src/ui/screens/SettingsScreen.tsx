'use client';

/**
 * Settings — language, audio, haptics, theme, motion. Persisted in localStorage.
 */
import { ReactNode, useEffect, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { audio } from '../../audio/audioEngine';
import { t, useLang, setLang, type Lang } from '../../i18n';

const PREFS_KEY = 'ec-prefs';

interface Prefs {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  motion: boolean;
  highContrast: boolean;
  theme?: string;
}

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return { sound: true, music: true, haptics: true, motion: false, highContrast: false };
  try {
    return { ...{ sound: true, music: true, haptics: true, motion: false, highContrast: false }, ...JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return { sound: true, music: true, haptics: true, motion: false, highContrast: false };
  }
}

export function SettingsScreen(): ReactNode {
  useLang();
  const setScreen = useGameStore((s) => s.setScreen);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [lang, setLangState] = useState<Lang>(() => (typeof window !== 'undefined' ? ((window.localStorage.getItem('ec-lang') as Lang) ?? 'en') : 'en'));

  useEffect(() => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    audio.setMuted(!prefs.sound && !prefs.music);
    audio.hapticsOn = prefs.haptics;
    useGameStore.getState().setReducedMotion(prefs.motion);
    document.documentElement.classList.toggle('ec-contrast', prefs.highContrast);
  }, [prefs]);

  useEffect(() => {
    if (prefs.music && audio['unlocked']) audio.startMusic();
    else audio.stopMusic();
  }, [prefs.music]);

  const changeLang = (l: Lang) => {
    setLang(l);
    setLangState(l);
    audio.play('click');
  };

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <button className="ec-btn ec-btn-ghost min-h-11 px-4 text-sm" onClick={() => { audio.play('click'); setScreen(useGameStore.getState().state ? 'game' : 'menu'); }}>
          ← {t('menu.back')}
        </button>
        <h1 className="text-xl font-black">⚙️ {t('settings.title')}</h1>
        <span className="w-20" />
      </header>

      <div className="ec-scroll flex-1 space-y-2 overflow-y-auto pb-6">
        <div className="rounded-2xl bg-[var(--ec-surface)] p-3 shadow-sm">
          <div className="mb-2 text-xs font-black uppercase text-[var(--ec-ink-soft)]">{t('settings.language')}</div>
          <div className="grid grid-cols-3 gap-2">
            {([['en', 'English'], ['ar', 'العربية'], ['fr', 'Français']] as [Lang, string][]).map(([code, name]) => (
              <button
                key={code}
                onClick={() => changeLang(code)}
                aria-pressed={lang === code}
                className={`h-11 rounded-xl text-sm font-extrabold ${lang === code ? 'bg-[var(--ec-brand)] text-white shadow' : 'ec-btn-sheet'}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <Toggle label={`🔊 ${t('settings.sound')}`} value={prefs.sound} onChange={(v) => setPrefs((p) => ({ ...p, sound: v }))} />
        <Toggle label={`🎵 ${t('settings.music')}`} value={prefs.music} onChange={(v) => setPrefs((p) => ({ ...p, music: v }))} />
        <Toggle label={`📳 ${t('settings.haptics')}`} value={prefs.haptics} onChange={(v) => setPrefs((p) => ({ ...p, haptics: v }))} />
        <Toggle label={`🐢 ${t('settings.motion')}`} value={prefs.motion} onChange={(v) => setPrefs((p) => ({ ...p, motion: v }))} />
        <Toggle label={`🌗 ${t('settings.highContrast')}`} value={prefs.highContrast} onChange={(v) => setPrefs((p) => ({ ...p, highContrast: v }))} />

        <div className="rounded-2xl bg-[var(--ec-surface)] p-3 shadow-sm">
          <div className="mb-2 text-xs font-black uppercase text-[var(--ec-ink-soft)]">Theme</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="ec-btn ec-btn-sheet" onClick={() => { document.documentElement.classList.add('dark'); }}>
              🌙 Dark
            </button>
            <button className="ec-btn ec-btn-sheet" onClick={() => { document.documentElement.classList.remove('dark'); }}>
              ☀️ Light
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }): ReactNode {
  return (
    <button
      className="flex w-full items-center justify-between rounded-2xl bg-[var(--ec-surface)] px-4 py-3 text-sm font-bold shadow-sm"
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
