'use client';

/**
 * LanAdapter — 2-6 players over WebRTC data channels on local Wi-Fi.
 * Signaling via QR codes: host shows compressed offer QR → guest scans and
 * shows answer QR → host scans back. No internet, no STUN (host candidates).
 * Star topology; the host relays game state.
 */
import type { GameState, GameAction } from '../engines/types';
import type { NetworkAdapter, PlayerProfile, RoomInfo } from './NetworkAdapter';

interface PeerCtx {
  uid: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  profile?: PlayerProfile;
}

const ICE: RTCConfiguration = {
  iceServers: [], // local network only
};

export class LanAdapter implements NetworkAdapter {
  readonly kind = 'lan' as const;
  private peers = new Map<string, PeerCtx>();
  private isHost = false;
  private uid: string;
  private code = 'LAN';
  private myProfile: PlayerProfile | null = null;

  private stateCb: ((s: GameState) => void) | null = null;
  private roomCb: ((info: RoomInfo) => void) | null = null;
  private errorCb: ((m: string) => void) | null = null;
  private chatCb: ((m: { uid: string; name: string; text: string; ts: number }) => void) | null = null;

  private pendingAction: GameAction | null = null;
  private lastState: GameState | null = null;
  private started = false;
  private maxPlayers = 6;

  constructor() {
    this.uid = `lan-${Math.random().toString(36).slice(2, 10)}`;
  }

  async connect(): Promise<void> { /* WebRTC is connectionless-setup */ }

  async disconnect(): Promise<void> {
    for (const p of this.peers.values()) {
      p.dc?.close();
      p.pc.close();
    }
    this.peers.clear();
  }

  getLatency(): number { return 0; }

  // ── HOST ──

  async createRoom(profile: PlayerProfile, maxPlayers = 6): Promise<string> {
    this.isHost = true;
    this.myProfile = profile;
    this.maxPlayers = maxPlayers;
    this.code = 'LAN';
    this.emitRoom();
    return this.uid; // host "code" = its signaling id
  }

  /** Host: build an offer for the next guest. Returns SDP (JSON, compressed-ish). */
  async createOffer(): Promise<{ sdp: string; uid: string }> {
    const uid = `g-${Math.random().toString(36).slice(2, 8)}`;
    const pc = new RTCPeerConnection(ICE);
    const ctx: PeerCtx = { uid, pc, dc: null };
    this.peers.set(uid, ctx);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.peers.delete(uid);
        this.emitRoom();
        this.errorCb?.('lan.peerLost');
      }
    };

    const dc = pc.createDataChannel('empire', { ordered: true });
    ctx.dc = dc;
    dc.onopen = () => {
      dc.send(JSON.stringify({ t: 'welcome', uid: this.uid }));
      this.emitRoom();
      if (this.lastState) this.sendStateTo(uid, this.lastState);
      if (this.pendingAction) {
        dc.send(JSON.stringify({ t: 'action', action: this.pendingAction }));
        this.pendingAction = null;
      }
    };
    dc.onmessage = (ev) => this.hostOnMessage(uid, ev.data);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // Wait for ICE gathering to complete (host candidates only)
    await this.waitForIce(pc);

    return { sdp: JSON.stringify(pc.localDescription), uid };
  }

  /** Host: consume guest's answer (guest scanned from their screen). */
  async acceptAnswer(answerSdp: string, uid: string): Promise<void> {
    const ctx = this.peers.get(uid);
    if (!ctx) throw new Error('lan.unknownPeer');
    await ctx.pc.setRemoteDescription(JSON.parse(answerSdp) as RTCSessionDescriptionInit);
  }

  private hostOnMessage(uid: string, raw: string): void {
    try {
      const msg = JSON.parse(raw) as { t: string; action?: GameAction; profile?: PlayerProfile; text?: string; name?: string };
      if (msg.t === 'hello' && msg.profile) {
        const ctx = this.peers.get(uid);
        if (ctx) ctx.profile = msg.profile;
        this.emitRoom();
      } else if (msg.t === 'action' && msg.action) {
        // dispatch through the host's store bridge
        window.dispatchEvent(new CustomEvent('ec-remote-action', { detail: { action: msg.action, uid } }));
      } else if (msg.t === 'chat' && msg.text) {
        this.chatCb?.({ uid, name: msg.name ?? 'Guest', text: msg.text.slice(0, 140), ts: Date.now() });
      }
    } catch { /* ignore malformed */ }
  }

  // ── GUEST ──

  /** Guest: consume host's offer and produce an answer QR payload. */
  async joinRoom(code: string, profile: PlayerProfile): Promise<void> {
    this.isHost = false;
    this.myProfile = profile;
    this.code = code.trim().toUpperCase() || 'LAN';

    const pc = new RTCPeerConnection(ICE);
    const ctx: PeerCtx = { uid: 'host', pc, dc: null };
    this.peers.set('host', ctx);

    pc.ondatachannel = (ev) => {
      const dc = ev.channel;
      ctx.dc = dc;
      dc.onopen = () => {
        dc.send(JSON.stringify({ t: 'hello', profile }));
        this.emitRoom();
      };
      dc.onmessage = (e) => this.guestOnMessage(e.data);
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.errorCb?.('lan.hostLost');
      }
    };

    // Offer QR payload: {o: RTCSessionDescriptionInit}
    await pc.setRemoteDescription(JSON.parse(code) as RTCSessionDescriptionInit);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.waitForIce(pc);
    // The UI reads the answer via getPendingAnswer()
    this.pendingAnswer = JSON.stringify(pc.localDescription);
  }

  private pendingAnswer: string | null = null;

  getPendingAnswer(): string | null {
    const a = this.pendingAnswer;
    this.pendingAnswer = null;
    return a;
  }

  private guestOnMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as { t: string; state?: GameState; action?: GameAction; text?: string; name?: string };
      if (msg.t === 'state' && msg.state) {
        this.lastState = msg.state;
        this.stateCb?.(msg.state);
      } else if (msg.t === 'chat' && msg.text) {
        this.chatCb?.({ uid: 'host', name: msg.name ?? 'Host', text: msg.text, ts: Date.now() });
      }
    } catch { /* ignore */ }
  }

  private waitForIce(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  // ── transport ──

  sendAction(action: GameAction): void {
    if (this.isHost) return; // host applies locally
    const host = this.peers.get('host');
    if (host?.dc?.readyState === 'open') {
      host.dc.send(JSON.stringify({ t: 'action', action }));
    } else {
      this.pendingAction = action; // queue until open
    }
  }

  publishState(state: GameState): void {
    this.lastState = state;
    if (!this.isHost) return;
    for (const [uid, p] of this.peers) {
      if (p.dc?.readyState === 'open') {
        try { p.dc.send(JSON.stringify({ t: 'state', state })); } catch { this.peers.delete(uid); }
      }
    }
  }

  private sendStateTo(uid: string, state: GameState): void {
    const p = this.peers.get(uid);
    if (p?.dc?.readyState === 'open') {
      p.dc.send(JSON.stringify({ t: 'state', state }));
    }
  }

  async markStarted(): Promise<void> {
    this.started = true;
    this.emitRoom();
  }

  private emitRoom(): void {
    const players: RoomInfo['players'] = [];
    if (this.myProfile) {
      players.push({ uid: this.uid, profile: this.myProfile, connected: true, ready: true });
    }
    for (const [uid, p] of this.peers) {
      if (p.profile) players.push({ uid, profile: p.profile, connected: p.dc?.readyState === 'open', ready: true });
    }
    this.roomCb?.({
      code: this.code,
      hostId: this.isHost ? this.uid : 'host',
      players,
      status: this.started ? 'playing' : 'lobby',
      maxPlayers: this.maxPlayers,
    });
  }

  onState(cb: (state: GameState) => void): void { this.stateCb = cb; }
  onRoomInfo(cb: (info: RoomInfo) => void): void { this.roomCb = cb; }
  onPlayerJoin(_cb: (uid: string, profile: PlayerProfile) => void): void { /* via room info */ }
  onPlayerLeave(_cb: (uid: string) => void): void { /* via room info */ }
  onError(cb: (message: string) => void): void { this.errorCb = cb; }
  onChat(cb: (msg: { uid: string; name: string; text: string; ts: number }) => void): void { this.chatCb = cb; }
  sendChat(text: string): void {
    for (const p of this.peers.values()) {
      if (p.dc?.readyState === 'open') {
        p.dc.send(JSON.stringify({ t: 'chat', text, name: this.myProfile?.name }));
      }
    }
  }
}
