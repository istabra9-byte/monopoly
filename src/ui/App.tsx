'use client';

/**
 * App root — screen router + global effects (audio unlock, PWA, haptics).
 */
import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { audio } from '../audio/audioEngine';
import { useLang, setLang, isRtl } from '../i18n';
import { AmbientBackground } from '../art/props/Themes';
import { SplashScreen } from './screens/SplashScreen';
import { MenuScreen } from './screens/MenuScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { JoinScreen } from './screens/JoinScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const theme = useGameStore((s) => s.state?.settings.theme ?? 'classic');
  const lang = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  // PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* offline-only nicety */ });
    }
  }, []);

  // Global audio unlock on first gesture
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <div className={`ec-root ec-no-zoom relative ${useGameStore.getState().reducedMotion ? 'ec-reduced-motion' : ''}`}>
      <AmbientBackground theme={theme} />
      {screen === 'splash' && <SplashScreen />}
      {screen === 'menu' && <MenuScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'results' && <ResultsScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'tutorial' && <TutorialScreen />}
      {screen === 'join' && <JoinScreen mode="online" />}
      {screen === 'joinlan' && <JoinScreen mode="lan" />}
    </div>
  );
}

export { setLang };
