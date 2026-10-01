'use client';

/**
 * AudioEngine — Web Audio API synthesis. No audio files: every SFX and the
 * music loop are generated (oscillators/noise) so the game stays offline and
 * tiny. Categories: sfx / ui / music with per-category volume + master mute.
 * Unlocks on first user gesture (mobile autoplay policy).
 */
export type SfxName =
  | 'dice' | 'step' | 'buy' | 'rent' | 'cash' | 'card' | 'jail' | 'build'
  | 'auction' | 'hammer' | 'bankrupt' | 'victory' | 'click' | 'error' | 'passGo' | 'trade';

type Category = 'sfx' | 'ui' | 'music';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Category, GainNode>> = {};
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private unlocked = false;

  volumes: Record<Category, number> = { sfx: 0.9, ui: 0.7, music: 0.4 };
  muted = false;
  hapticsOn = true;

  unlock(): void {
    if (this.unlocked) return;
    try {
      const AC: typeof AudioContext | undefined =
        typeof window !== 'undefined'
          ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      for (const cat of ['sfx', 'ui', 'music'] as Category[]) {
        const g = this.ctx.createGain();
        g.gain.value = this.volumes[cat];
        g.connect(this.master);
        this.buses[cat] = g;
      }
      this.unlocked = true;
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // audio unsupported — stay silent
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  setVolume(cat: Category, v: number): void {
    this.volumes[cat] = v;
    const bus = this.buses[cat];
    if (bus && this.ctx) bus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  private beep(cat: Category, freq: number, dur: number, when = 0, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number): void {
    if (!this.ctx || !this.buses[cat]) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.buses[cat]!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(cat: Category, dur: number, when = 0, vol = 0.3, hp = 1200): void {
    if (!this.ctx || !this.buses[cat]) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.buses[cat]!);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (!this.unlocked || this.muted) return;
    switch (name) {
      case 'dice':
        this.noise('sfx', 0.09, 0, 0.35, 900);
        this.noise('sfx', 0.07, 0.09, 0.28, 1400);
        this.noise('sfx', 0.11, 0.17, 0.3, 700);
        this.beep('sfx', 220, 0.12, 0.2, 'triangle', 0.3, 160);
        break;
      case 'step':
        this.beep('sfx', 620, 0.06, 0, 'triangle', 0.22);
        break;
      case 'passGo':
        this.beep('sfx', 523, 0.12, 0, 'sine', 0.4);
        this.beep('sfx', 659, 0.12, 0.1, 'sine', 0.4);
        this.beep('sfx', 784, 0.2, 0.2, 'sine', 0.4);
        break;
      case 'buy':
        this.beep('sfx', 392, 0.1, 0, 'triangle', 0.35);
        this.beep('sfx', 523, 0.16, 0.09, 'triangle', 0.35);
        break;
      case 'rent':
        this.beep('sfx', 320, 0.16, 0, 'sawtooth', 0.16, 210);
        this.noise('ui', 0.1, 0.02, 0.08, 500);
        break;
      case 'cash':
        this.beep('sfx', 880, 0.08, 0, 'sine', 0.3);
        this.beep('sfx', 1174, 0.12, 0.07, 'sine', 0.3);
        break;
      case 'card':
        this.noise('sfx', 0.08, 0, 0.25, 2200);
        this.beep('sfx', 700, 0.07, 0.06, 'triangle', 0.2);
        break;
      case 'jail':
        this.beep('sfx', 200, 0.3, 0, 'square', 0.18, 110);
        this.noise('sfx', 0.14, 0.05, 0.2, 400);
        break;
      case 'build':
        this.beep('sfx', 300, 0.07, 0, 'square', 0.2);
        this.beep('sfx', 430, 0.09, 0.07, 'square', 0.2);
        this.beep('sfx', 560, 0.12, 0.15, 'triangle', 0.25);
        break;
      case 'auction':
        this.beep('sfx', 440, 0.1, 0, 'triangle', 0.3);
        this.beep('sfx', 440, 0.1, 0.14, 'triangle', 0.3);
        break;
      case 'hammer':
        this.noise('sfx', 0.1, 0, 0.4, 300);
        this.beep('sfx', 150, 0.16, 0, 'square', 0.3, 80);
        break;
      case 'bankrupt':
        this.beep('sfx', 392, 0.25, 0, 'sawtooth', 0.2, 200);
        this.beep('sfx', 262, 0.4, 0.22, 'sawtooth', 0.2, 130);
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => this.beep('sfx', f, 0.3, i * 0.14, 'triangle', 0.4));
        this.beep('sfx', 1319, 0.5, 0.6, 'sine', 0.3);
        break;
      case 'click':
        this.beep('ui', 660, 0.045, 0, 'sine', 0.22);
        break;
      case 'error':
        this.beep('ui', 200, 0.14, 0, 'square', 0.2);
        this.beep('ui', 160, 0.18, 0.1, 'square', 0.2);
        break;
      case 'trade':
        this.beep('ui', 494, 0.1, 0, 'sine', 0.28);
        this.beep('ui', 587, 0.14, 0.1, 'sine', 0.28);
        break;
    }
  }

  vibrate(pattern: number | number[]): void {
    if (!this.hapticsOn) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch { /* ignore */ }
    }
  }

  startMusic(): void {
    if (!this.unlocked || this.musicTimer) return;
    // Gentle marimba-ish loop (pentatonic, 8 bars)
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    const bass = [131, 98, 110, 131];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const step = this.musicStep % 32;
      if (step % 8 === 0) {
        this.beep('music', bass[(step / 8) % 4], 0.5, 0, 'sine', 0.5);
      }
      if (step % 2 === 0 && Math.random() < 0.72) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        this.beep('music', note, 0.34, 0, 'triangle', 0.16);
        if (Math.random() < 0.3) this.beep('music', note * 1.5, 0.22, 0.12, 'triangle', 0.08);
      }
      this.musicStep++;
    }, 320);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();

/** Map a GameEvent to sfx + haptics. Used by the game screen effect. */
export function eventToSfx(e: { type: string; amount?: number }): { sfx?: SfxName; vibe?: number | number[] } {
  switch (e.type) {
    case 'diceRolled': return { sfx: 'dice', vibe: [18, 30, 18] };
    case 'rentPaid': return { sfx: 'rent', vibe: 24 };
    case 'propertyBought': return { sfx: 'buy', vibe: [12, 24] };
    case 'auctionWon': return { sfx: 'hammer', vibe: 20 };
    case 'auctionStart': return { sfx: 'auction' };
    case 'houseBuilt': return { sfx: 'build', vibe: 14 };
    case 'houseSold': return { sfx: 'click' };
    case 'cardDrawn': return { sfx: 'card', vibe: 12 };
    case 'jailEnter': return { sfx: 'jail', vibe: [40, 60, 40] };
    case 'jailLeave': return { sfx: 'passGo' };
    case 'goSalary': return { sfx: 'passGo', vibe: 16 };
    case 'passGo': return { sfx: 'passGo' };
    case 'bankrupt': return { sfx: 'bankrupt', vibe: [60, 80, 60] };
    case 'gameOver': return { sfx: 'victory', vibe: [30, 40, 30, 40, 80] };
    case 'tradeAccepted': return { sfx: 'trade' };
    case 'notEnoughMoney': return { sfx: 'error', vibe: 40 };
    case 'cashChange': return e.amount && e.amount > 0 ? { sfx: 'cash' } : { sfx: 'click' };
    default: return {};
  }
}
