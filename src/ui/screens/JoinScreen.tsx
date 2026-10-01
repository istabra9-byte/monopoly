'use client';

/**
 * Join — online (Firebase) and LAN (WebRTC+QR) lobby flows.
 * Host creates a room and invites; guests join by code or QR scan.
 */
import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { audio } from '../../audio/audioEngine';
import { t, useLang } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import { CharacterPortrait } from '../../art/characters/Characters';
import { CHARACTERS } from '../../data/board';
import { isFirebaseConfigured, firebaseConfig } from '../../config/firebase.config';
import type { PlayerProfile } from '../../network/NetworkAdapter';
import { applyAction, createGame } from '../../engines/rulesEngine';
import type { GameState } from '../../engines/types';

type Phase = 'pick' | 'hosting' | 'joining' | 'lobby' | 'scanning' | 'show-answer' | 'connecting';

const DEFAULT_COLORS = ['#2E86AB', '#E4572E', '#4A9E5C', '#D86FA4', '#F2B33D', '#6B4FA0'];

export function JoinScreen({ mode }: { mode: 'online' | 'lan' }): ReactNode {
  useLang();
  const setScreen = useGameStore((s) => s.setScreen);
  const [phase, setPhase] = useState<Phase>('pick');
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [name] = useState(`P${Math.floor(Math.random() * 900 + 100)}`);
  const [charId, setCharId] = useState(CHARACTERS[Math.floor(Math.random() * 12)].id);
  const [lanPayload, setLanPayload] = useState<string | null>(null);
  const [answerPayload, setAnswerPayload] = useState<string | null>(null);
  const adapterRef = useRef<import('../../network/NetworkAdapter').NetworkAdapter | null>(null);
  const botCountRef = useRef(0);
  const playersRef = useRef<Array<{ uid: string; profile: PlayerProfile; connected?: boolean; ready?: boolean }>>([]);

  useEffect(() => () => { void adapterRef.current?.disconnect(); }, []);

  const profileOf = (): PlayerProfile => ({ name, characterId: charId });

  // ── ONLINE ──
  const hostOnline = async () => {
    setError(null);
    if (!isFirebaseConfigured()) { setError(t('online.offline')); return; }
    try {
      const { FirebaseAdapter } = await import('../../network/FirebaseAdapter');
      const adapter = new FirebaseAdapter();
      await adapter.connect();
      adapterRef.current = adapter;
      const code = await adapter.createRoom(profileOf());
      setRoomCode(code);
      setPhase('lobby');
      wireLobby(adapter, 'online', true);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  };

  const joinOnline = async () => {
    setError(null);
    if (!isFirebaseConfigured()) { setError(t('online.offline')); return; }
    try {
      const { FirebaseAdapter } = await import('../../network/FirebaseAdapter');
      const adapter = new FirebaseAdapter();
      await adapter.connect();
      adapterRef.current = adapter;
      await adapter.joinRoom(joinCode, profileOf());
      setRoomCode(joinCode.toUpperCase());
      setPhase('lobby');
      wireLobby(adapter, 'online', false);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  };

  // ── LAN ──
  const hostLan = async () => {
    setError(null);
    const { LanAdapter } = await import('../../network/LanAdapter');
    const adapter = new LanAdapter();
    adapterRef.current = adapter;
    await adapter.connect();
    await adapter.createRoom(profileOf());
    const offer = await adapter.createOffer();
    setLanPayload(JSON.stringify(offer));
    setPhase('hosting');
    wireLobby(adapter, 'lan', true);
  };

  const scanHostQr = async () => {
    setPhase('scanning');
  };

  const onScanned = async (payload: string) => {
    // payload = {sdp, uid}
    try {
      const { LanAdapter } = await import('../../network/LanAdapter');
      const adapter = new LanAdapter();
      adapterRef.current = adapter;
      await adapter.connect();
      const code = payload.startsWith('{') ? payload : JSON.parse(decodeURIComponent(payload)) as string;
      await adapter.joinRoom(code, profileOf());
      const answer = adapter.getPendingAnswer();
      if (answer) {
        setAnswerPayload(answer);
        setPhase('show-answer');
        wireLobby(adapter, 'lan', false);
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setPhase('pick');
    }
  };

  // ── lobby wiring + game start ──
  const wireLobby = (
    adapter: import('../../network/NetworkAdapter').NetworkAdapter,
    netMode: 'online' | 'lan',
    host: boolean,
  ) => {
    adapter.onRoomInfo((info) => {
      playersRef.current = info.players.filter((p) => p.profile);
      // lobby re-render via store pushEvent (simplest shared trigger)
      useGameStore.getState().pushEvent({ type: 'turnEnd', meta: { lobby: info.players.length } });
      if (info.status === 'playing' && !host) return;
    });

    adapter.onState((state) => {
      // guest receives authoritative state
      const myUid = guessUid(netMode);
      useGameStore.getState().loadGameState(state, { mode: netMode, isHost: false, localPlayerId: myUid });
      useGameStore.getState().setScreen('game');
    });

    if (host) {
      // host listens for remote actions and applies them
      const onRemote = (ev: Event) => {
        const detail = (ev as CustomEvent<{ action: import('../../engines/types').GameAction }>).detail;
        if (detail?.action) {
          useGameStore.getState().dispatch(detail.action);
        }
      };
      window.addEventListener('ec-remote-action', onRemote);
    }

    // expose start function for the lobby UI
    (window as unknown as { __ecStartLobbyGame?: () => void }).__ecStartLobbyGame = () => {
      startLobbyGame(netMode);
    };
  };

  const guessUid = (_mode: 'online' | 'lan'): string => 'p1'; // refined at start (players order)

  const startLobbyGame = (netMode: 'online' | 'lan') => {
    const adapter = adapterRef.current;
    if (!adapter || playersRef.current.length < 2) return;
    const players = playersRef.current;
    const configs = players.map((p, i) => ({
      name: p.profile.name,
      characterId: p.profile.characterId,
      color: DEFAULT_COLORS[i % 6],
      isBot: p.profile.isBot ?? false,
      botDifficulty: p.profile.botDifficulty,
      uid: p.uid,
    }));
    const seed = Math.floor(Math.random() * 1e9);
    const state: GameState = createGame(`net-${seed}`, seed, configs, {});
    const started = applyAction(state, { type: 'START_GAME' }).state;
    useGameStore.getState().loadGameState(started, { mode: netMode, isHost: true, localPlayerId: 'p0' });
    useGameStore.getState().setScreen('game');
    void adapter.markStarted();
    adapter.publishState(started);
  };

  const addBot = async () => {
    const adapter = adapterRef.current as import('../../network/FirebaseAdapter').FirebaseAdapter | null;
    botCountRef.current += 1;
    const botChar = CHARACTERS[(botCountRef.current * 3) % 12];
    if (roomCode && adapter && 'addBot' in adapter) {
      await adapter.addBot(roomCode, String(botCountRef.current), t(botChar.nameKey), botChar.id, 'normal');
    }
  };

  return (
    <div className="absolute inset-0 mx-auto flex max-w-md flex-col px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <button className="ec-btn ec-btn-ghost min-h-11 px-4 text-sm" onClick={() => { audio.play('click'); setScreen('menu'); }}>
          ← {t('menu.back')}
        </button>
        <h1 className="text-xl font-black">{mode === 'online' ? `🌐 ${t('online.title')}` : `📶 ${t('lan.title')}`}</h1>
        <span className="w-20" />
      </header>

      <div className="ec-scroll flex-1 overflow-y-auto pb-6">
        {error && (
          <p className="mb-3 rounded-xl bg-[var(--ec-bad)]/10 p-3 text-center text-sm font-bold text-[var(--ec-bad)]">{error}</p>
        )}

        {phase === 'pick' && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              <CharacterPortrait characterId={charId} emotion="happy" size={72} />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {CHARACTERS.map((c) => (
                <button key={c.id} onClick={() => setCharId(c.id)} aria-label={t(c.nameKey)}
                  className={`rounded-xl p-0.5 ${charId === c.id ? 'ring-2 ring-[var(--ec-brand)]' : 'opacity-70'}`}>
                  <CharacterPortrait characterId={c.id} emotion="idle" size="100%" />
                </button>
              ))}
            </div>
            {mode === 'online' ? (
              <>
                <button className="ec-btn ec-btn-primary w-full" onClick={hostOnline}>➕ {t('online.create')}</button>
                <div className="rounded-2xl bg-[var(--ec-surface)] p-3 shadow-sm">
                  <label className="mb-1.5 block text-xs font-black uppercase text-[var(--ec-ink-soft)]">{t('online.code')}</label>
                  <div className="flex gap-2">
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="ABC123"
                      aria-label={t('online.code')}
                      className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-center text-xl font-black tracking-[0.3em] outline-none focus:ring-2 focus:ring-[var(--focus)]"
                    />
                    <button className="ec-btn ec-btn-good px-5" onClick={joinOnline} disabled={joinCode.length !== 6}>→</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button className="ec-btn ec-btn-primary w-full" onClick={hostLan}>📡 {t('lan.host')}</button>
                <button className="ec-btn ec-btn-ghost w-full" onClick={scanHostQr}>📷 {t('lan.join')}</button>
              </>
            )}
          </div>
        )}

        {phase === 'hosting' && mode === 'lan' && lanPayload && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-[var(--ec-ink-soft)]">{t('lan.hostInfo')}</p>
            <QrBox payload={lanPayload} size={240} />
            <p className="text-xs text-[var(--ec-ink-soft)]">{t('lan.waiting')}</p>
          </div>
        )}

        {phase === 'scanning' && (
          <QrScanner onResult={onScanned} onClose={() => setPhase('pick')} />
        )}

        {phase === 'show-answer' && answerPayload && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold">{t('lan.showQr')}</p>
            <QrBox payload={answerPayload} size={240} />
          </div>
        )}

        {phase === 'lobby' && (
          <div className="space-y-4">
            {roomCode && (
              <div className="rounded-2xl bg-[var(--ec-surface)] p-4 text-center shadow-sm">
                <div className="text-xs font-black uppercase text-[var(--ec-ink-soft)]">{t('lan.code')}</div>
                <div className="text-4xl font-black tracking-[0.3em] text-[var(--ec-brand)]">{roomCode}</div>
                <button
                  className="ec-btn ec-btn-sheet mt-2 min-h-9 px-4 text-xs"
                  onClick={() => { void navigator.clipboard?.writeText(roomCode); audio.play('click'); }}
                >
                  📋 {t('online.share')}
                </button>
              </div>
            )}
            <div className="space-y-2">
              {playersRef.current.map((p, i) => (
                <div key={p.uid} className="flex items-center gap-2 rounded-2xl bg-[var(--ec-surface)] p-2 shadow-sm">
                  <span className="w-5 text-center font-black text-[var(--ec-ink-soft)]">{i + 1}</span>
                  <CharacterPortrait characterId={p.profile.characterId} emotion={p.profile.isBot ? 'thinking' : 'idle'} size={36} />
                  <span className="flex-1 truncate text-sm font-black">{p.profile.name}</span>
                  <span className="ec-chip">{p.connected ? '🟢' : '⚪'}</span>
                </div>
              ))}
            </div>
            {mode === 'online' && (
              <button className="ec-btn ec-btn-ghost w-full" onClick={addBot}>🤖 + Bot</button>
            )}
            <button
              className="ec-btn ec-btn-primary w-full"
              disabled={playersRef.current.length < 2}
              onClick={() => startLobbyGame(mode)}
            >
              🎲 {t('lan.start')}
            </button>
            {playersRef.current.length < 2 && (
              <p className="text-center text-xs font-bold text-[var(--ec-ink-soft)]">{t('lan.waiting')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR helpers ─────────────────────────────────────────────────────────────

function QrBox({ payload, size }: { payload: string; size: number }): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void import('qrcode').then((QR) => {
      if (ref.current) {
        void QR.toCanvas(ref.current, payload, { width: size, margin: 1 });
      }
    });
  }, [payload, size]);
  return <motion.canvas ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white p-2 shadow-lg" width={size} height={size} />;
}

function QrScanner({ onResult, onClose }: { onResult: (payload: string) => void; onClose: () => void }): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const { default: jsQR } = await import('jsqr');
        const canvas = document.createElement('canvas');
        const tick = () => {
          if (cancelled) return;
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const w = videoRef.current.videoWidth;
            const h = videoRef.current.videoHeight;
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx && w > 0) {
              ctx.drawImage(videoRef.current, 0, 0);
              const img = ctx.getImageData(0, 0, w, h);
              const code = jsQR(img.data, w, h);
              if (code?.data) {
                onResult(code.data);
                return;
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError('📷 ✗');
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {error && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{error}</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={manual} onChange={(e) => setManual(e.target.value)}
          placeholder='{"sdp":…} or code'
          aria-label="Manual code entry"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--focus)]"
        />
        <button className="ec-btn ec-btn-primary px-4" onClick={() => manual && onResult(manual)}>OK</button>
        <button className="ec-btn ec-btn-ghost px-4" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export { firebaseConfig };
