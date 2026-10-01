/**
 * Empire City — parametric character illustration system.
 * 12 original characters × 8 emotion states, built from layered primitives:
 * bust = backdrop + body + head + hair + hat + face(expression) + overlay.
 * All original artwork following docs/art-style-guide.md (soft-3D vector,
 * light top-left, gradients, soft shadows).
 */
import type { ReactNode } from 'react';
import { shade } from '../primitives';

export type Emotion = 'idle' | 'happy' | 'sad' | 'angry' | 'thinking' | 'jailed' | 'bankrupt' | 'winner';

export interface Look {
  id: string;
  accent: string;
  accentDark: string;
  skin: string;
  hair: string;
  hat: 'sailor' | 'toque' | 'helmet' | 'deerstalker' | 'space' | 'beret' | 'pith' | 'racing' | 'goggles' | 'knight' | 'tricorne' | 'fez';
  hairStyle: 'short' | 'curly' | 'bun' | 'long' | 'bald' | 'spiky' | 'wavy' | 'undercut';
  collar?: 'pocket' | 'buttons' | 'zip' | 'lapel' | 'badge' | 'scarf';
}

export const LOOKS: Record<string, Look> = {
  sailor:    { id: 'sailor',    accent: '#2E86AB', accentDark: '#1D5F7E', skin: '#F2C49B', hair: '#4A3728', hat: 'sailor', hairStyle: 'short', collar: 'scarf' },
  chef:      { id: 'chef',      accent: '#E4572E', accentDark: '#B23A18', skin: '#E8B48A', hair: '#2E2117', hat: 'toque', hairStyle: 'short', collar: 'buttons' },
  pilot:     { id: 'pilot',     accent: '#5A7D9A', accentDark: '#3D5A73', skin: '#C68E5A', hair: '#1A1A1A', hat: 'helmet', hairStyle: 'undercut', collar: 'zip' },
  detective: { id: 'detective', accent: '#7C5CFF', accentDark: '#5A3FD1', skin: '#F2C49B', hair: '#3A2E20', hat: 'deerstalker', hairStyle: 'wavy', collar: 'lapel' },
  astronaut: { id: 'astronaut', accent: '#F2B33D', accentDark: '#C08A1E', skin: '#8C5A3C', hair: '#101010', hat: 'space', hairStyle: 'bald', collar: 'zip' },
  artist:    { id: 'artist',    accent: '#D86FA4', accentDark: '#A84A7C', skin: '#F5D0A8', hair: '#C43B4A', hat: 'beret', hairStyle: 'bun', collar: 'pocket' },
  explorer:  { id: 'explorer',  accent: '#4A9E5C', accentDark: '#337A43', skin: '#B87A4E', hair: '#2E2117', hat: 'pith', hairStyle: 'short', collar: 'pocket' },
  racer:     { id: 'racer',     accent: '#C43B4A', accentDark: '#922834', skin: '#F2C49B', hair: '#6B4A2E', hat: 'racing', hairStyle: 'short', collar: 'zip' },
  inventor:  { id: 'inventor',  accent: '#8A9BA8', accentDark: '#5E7080', skin: '#E8C39E', hair: '#B8B8C4', hat: 'goggles', hairStyle: 'spiky', collar: 'pocket' },
  knight:    { id: 'knight',    accent: '#9AA5B1', accentDark: '#6E7A87', skin: '#D9A066', hair: '#4A3728', hat: 'knight', hairStyle: 'short', collar: 'badge' },
  pirate:    { id: 'pirate',    accent: '#2C6E63', accentDark: '#1D4E46', skin: '#C68E5A', hair: '#1A1A1A', hat: 'tricorne', hairStyle: 'long', collar: 'scarf' },
  magician:  { id: 'magician',  accent: '#6B4FA0', accentDark: '#4C3678', skin: '#F2C49B', hair: '#2E2438', hat: 'fez', hairStyle: 'wavy', collar: 'lapel' },
};

// ─── Face layers ────────────────────────────────────────────────────────────

function Eyes({ e, skin, look }: { e: Emotion; skin: string; look: Look }): ReactNode {
  const ink = '#26243B';
  switch (e) {
    case 'happy':
    case 'winner':
      return (
        <g aria-hidden="true">
          <path d="M 32 46 q 5 -6 10 0" stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M 58 46 q 5 -6 10 0" stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bankrupt':
      return (
        <g aria-hidden="true" stroke={ink} strokeWidth={2.2} strokeLinecap="round">
          <path d="M 33 43 l 8 6 M 41 43 l -8 6" />
          <path d="M 59 43 l 8 6 M 67 43 l -8 6" />
        </g>
      );
    case 'angry':
      return (
        <g aria-hidden="true">
          <circle cx={37} cy={47} r={3.2} fill={ink} />
          <circle cx={63} cy={47} r={3.2} fill={ink} />
          <path d="M 30 40 l 12 4 M 70 40 l -12 4" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
    case 'thinking':
      return (
        <g aria-hidden="true">
          <circle cx={38} cy={44} r={3.2} fill={ink} />
          <circle cx={64} cy={44} r={3.2} fill={ink} />
          <path d="M 31 37 q 6 -3 12 0" stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <circle cx={39} cy={43} r={1} fill="#fff" />
          <circle cx={65} cy={43} r={1} fill="#fff" />
        </g>
      );
    default:
      return (
        <g aria-hidden="true">
          <circle cx={37} cy={46} r={3.4} fill={ink} />
          <circle cx={63} cy={46} r={3.4} fill={ink} />
          <circle cx={38.2} cy={44.8} r={1.1} fill="#fff" />
          <circle cx={64.2} cy={44.8} r={1.1} fill="#fff" />
          {e === 'sad' && (
            <>
              <path d="M 31 42 q 6 -2 11 0" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
              <path d="M 58 42 q 6 -2 11 0" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      );
  }
}

function Mouth({ e }: { e: Emotion }): ReactNode {
  const ink = '#26243B';
  switch (e) {
    case 'happy':
    case 'winner':
      return (
        <g aria-hidden="true">
          <path d="M 41 58 q 9 9 18 0 q -9 4 -18 0" fill={ink} />
          <path d="M 43 59.5 q 7 5.5 14 0" fill="#E8756A" />
        </g>
      );
    case 'sad':
    case 'bankrupt':
      return <path d="M 43 61 q 7 -6 14 0" stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
    case 'angry':
      return (
        <g aria-hidden="true">
          <path d="M 43 60 q 7 4 14 0" stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'thinking':
      return <path d="M 46 59 q 5 1.5 9 0" stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M 44 58 q 6 4.5 12 0" stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
  }
}

function Blush({ e, skin }: { e: Emotion; skin: string }): ReactNode {
  if (e === 'angry' || e === 'bankrupt') return null;
  const color = shade(skin, -18);
  return (
    <g aria-hidden="true" opacity={e === 'happy' || e === 'winner' ? 0.55 : 0.3}>
      <ellipse cx={30} cy={55} rx={4} ry={2.4} fill={color} />
      <ellipse cx={70} cy={55} rx={4} ry={2.4} fill={color} />
    </g>
  );
}

// ─── Hair & hats (silhouette identity) ──────────────────────────────────────

function Hair({ look }: { look: Look }): ReactNode {
  const { hair, hairStyle, skin } = look;
  const hi = shade(hair, 18);
  switch (hairStyle) {
    case 'bald': return null;
    case 'curly':
      return (
        <g aria-hidden="true">
          <circle cx={32} cy={34} r={7} fill={hair} />
          <circle cx={68} cy={34} r={7} fill={hair} />
          <circle cx={40} cy={29} r={7} fill={hi} />
          <circle cx={60} cy={29} r={7} fill={hair} />
          <circle cx={50} cy={27} r={6} fill={hi} />
        </g>
      );
    case 'bun':
      return (
        <g aria-hidden="true">
          <circle cx={50} cy={24} r={6} fill={hair} />
          <path d="M 32 38 q 2 -14 18 -15 q 16 1 18 15 q -8 -8 -18 -8 q -10 0 -18 8" fill={hair} />
          <path d="M 36 33 q 6 -6 14 -6" stroke={hi} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'long':
      return (
        <g aria-hidden="true">
          <path d="M 28 46 q -2 -22 22 -23 q 24 1 22 23 l -3 12 q -1 -12 -8 -15 q -2 6 -11 6 q -9 0 -11 -6 q -7 3 -8 15 z" fill={hair} />
          <path d="M 38 30 q 8 -6 18 -3" stroke={hi} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'spiky':
      return (
        <g aria-hidden="true">
          <path d="M 31 38 l 3 -9 l 5 7 l 4 -10 l 5 9 l 5 -10 l 5 10 l 4 -7 l 5 9 l 3 -6 l 0 7 q -9 -4 -19.5 -4 q -10 0 -19.5 4 z" fill={hair} />
        </g>
      );
    case 'wavy':
      return (
        <g aria-hidden="true">
          <path d="M 30 42 q -3 -18 20 -19 q 23 1 20 19 q -4 -9 -12 -10 q 2 4 -1 7 q -3 -6 -9 -6 q 3 4 -1 7 q -4 -5 -10 -4 q -5 1 -7 6 z" fill={hair} />
          <path d="M 40 31 q 7 -5 16 -2" stroke={hi} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'undercut':
      return (
        <g aria-hidden="true">
          <path d="M 32 36 q 1 -13 18 -13 q 17 0 18 13 q -6 -6 -18 -6 q -12 0 -18 6" fill={hair} />
        </g>
      );
    default: // short
      return (
        <g aria-hidden="true">
          <path d="M 31 40 q 0 -17 19 -17 q 19 0 19 17 q -7 -9 -19 -9 q -12 0 -19 9" fill={hair} />
          <path d="M 38 29 q 8 -4 16 -1" stroke={hi} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      );
  }
  void skin;
}

function Hat({ look, e }: { look: Look; e: Emotion }): ReactNode {
  const { hat, accent, accentDark, skin } = look;
  const white = '#F4F6F8';
  switch (hat) {
    case 'sailor':
      return (
        <g aria-hidden="true">
          <path d="M 30 30 q 0 -12 20 -12 q 20 0 20 12 z" fill={white} />
          <path d="M 28 30 q 22 6 44 0 l 2 4 q -24 6 -48 0 z" fill={accent} />
          <path d="M 34 24 q 16 -7 32 0 l 0 3 q -16 -5 -32 0 z" fill={accentDark} opacity={0.25} />
        </g>
      );
    case 'toque':
      return (
        <g aria-hidden="true">
          <rect x={32} y={8} width={36} height={24} rx={9} fill={white} />
          <rect x={32} y={26} width={36} height={7} rx={3} fill="#D8DCE2" />
          <circle cx={44} cy={14} r={5} fill="#fff" />
          <circle cx={55} cy={12} r={6} fill="#fff" />
          <circle cx={50} cy={19} r={4} fill="#EDF0F4" />
        </g>
      );
    case 'helmet':
      return (
        <g aria-hidden="true">
          <path d="M 30 34 q 0 -18 20 -18 q 20 0 20 18 z" fill="#8A6B4A" />
          <path d="M 30 34 q 0 -18 20 -18 q 20 0 20 18 z" fill={accent} opacity={0.45} />
          <rect x={27} y={30} width={46} height={6} rx={3} fill={accentDark} />
          <circle cx={41} cy={24} r={4} fill="#E8D5B5" opacity={0.8} />
          <g transform="translate(64 30)">
            <rect x={0} y={-3} width={9} height={6} rx={2} fill={accentDark} />
            <path d="M 9 0 l 8 -4 l 0 8 z" fill={accentDark} opacity={0.85} />
          </g>
        </g>
      );
    case 'deerstalker':
      return (
        <g aria-hidden="true">
          <path d="M 32 32 q 0 -14 18 -14 q 18 0 18 14 z" fill={accentDark} />
          <ellipse cx={38} cy={20} rx={9} ry={6} fill={accentDark} />
          <ellipse cx={62} cy={20} rx={9} ry={6} fill={accentDark} />
          <path d="M 50 12 l 0 14" stroke={shade(accentDark, -20)} strokeWidth={2.4} />
          <rect x={30} y={30} width={40} height={5} rx={2.5} fill={shade(accentDark, 12)} />
        </g>
      );
    case 'space':
      return (
        <g aria-hidden="true">
          <circle cx={50} cy={34} r={26} fill="#DDEFFF" opacity={0.32} />
          <circle cx={50} cy={34} r={26} fill="none" stroke="#BFE4F5" strokeWidth={2.5} />
          <ellipse cx={38} cy={22} rx={9} ry={5} fill="#ffffff" opacity={0.5} transform="rotate(-24 38 22)" />
          <rect x={20} y={30} width={12} height={9} rx={4} fill="#C8CDD6" />
          <rect x={68} y={30} width={12} height={9} rx={4} fill="#C8CDD6" />
        </g>
      );
    case 'beret':
      return (
        <g aria-hidden="true">
          <path d="M 30 28 q 4 -12 24 -10 q 16 2 16 10 q -20 -5 -40 0" fill={accent} />
          <circle cx={50} cy={18} r={2.6} fill={accentDark} />
        </g>
      );
    case 'pith':
      return (
        <g aria-hidden="true">
          <path d="M 31 29 q 3 -14 19 -14 q 16 0 19 14 z" fill="#F4EFE6" />
          <path d="M 31 29 q 19 6 38 0 l 1.5 3 q -20.5 6 -41 0 z" fill={accent} />
          <circle cx={50} cy={20} r={2.2} fill={accentDark} />
        </g>
      );
    case 'racing':
      return (
        <g aria-hidden="true">
          <path d="M 29 34 q 0 -19 21 -19 q 21 0 21 19 z" fill={accent} />
          <path d="M 29 34 q 21 5 42 0 l 0 3 q -21 5 -42 0 z" fill={accentDark} />
          <path d="M 44 16 h 12 v 6 h -12 z" fill="#F4EFE6" opacity={0.9} />
        </g>
      );
    case 'goggles':
      return (
        <g aria-hidden="true">
          <rect x={30} y={26} width={40} height={12} rx={6} fill="#5E7080" />
          <circle cx={41} cy={32} r={5} fill="#BFE4F5" opacity={0.9} />
          <circle cx={59} cy={32} r={5} fill="#BFE4F5" opacity={0.9} />
          <path d="M 34 26 q 16 -8 32 0" stroke="#5E7080" strokeWidth={3} fill="none" />
        </g>
      );
    case 'knight':
      return (
        <g aria-hidden="true">
          <path d="M 32 36 q 0 -22 18 -22 q 18 0 18 22 z" fill="#B8C2CC" />
          <path d="M 32 36 q 0 -22 18 -22 q 18 0 18 22 z" fill="url(#knightgrad)" opacity={0.5} />
          <rect x={45} y={8} width={10} height={12} rx={2} fill={accent} />
          <path d="M 50 4 l 2.4 5 5.6 0.6 -4 4 1 5.4 -5 -2.6 -5 2.6 1 -5.4 -4 -4 5.6 -0.6 z" fill="#F2B33D" />
        </g>
      );
    case 'tricorne':
      return (
        <g aria-hidden="true">
          <path d="M 28 30 q 22 -14 44 0 q -10 -6 -22 -6 q -12 0 -22 6" fill="#2E2A38" />
          <path d="M 26 31 q 24 -10 48 0 l -2 5 q -22 -8 -44 0 z" fill={accent} opacity={0.85} />
        </g>
      );
    case 'fez':
      return (
        <g aria-hidden="true">
          <path d="M 33 30 l 2 -16 q 15 -4 30 0 l 2 16 q -17 5 -34 0" fill={accent} />
          <circle cx={50} cy={13} r={3} fill="#F2B33D" />
          <path d="M 33 28 q 17 5 34 0 l 0.6 4 q -17.5 5 -35.2 0 z" fill={accentDark} />
        </g>
      );
  }
  void skin;
}

// ─── State overlays ─────────────────────────────────────────────────────────

function Overlay({ e, skin, uid }: { e: Emotion; skin: string; uid: string }): ReactNode {
  switch (e) {
    case 'jailed':
      return (
        <g aria-hidden="true">
          <rect x={14} y={14} width={72} height={72} rx={10} fill="rgba(38,36,59,0.22)" />
          {[24, 38, 52, 66, 80].map((x) => (
            <rect key={x} x={x} y={14} width={3.4} height={72} rx={1.7} fill="#8A8FA8" opacity={0.85} />
          ))}
          <rect x={14} y={14} width={72} height={72} rx={10} fill="none" stroke="#8A8FA8" strokeWidth={3} />
        </g>
      );
    case 'sad':
      return (
        <g aria-hidden="true">
          <path d={`M 33 51 q -2.5 5 0 7.5 q 2.5 -2.5 0 -7.5`} fill="#7FC4E8" />
          <path d={`M 67 51 q -2.5 5 0 7.5 q 2.5 -2.5 0 -7.5`} fill="#7FC4E8" />
        </g>
      );
    case 'angry':
      return (
        <g aria-hidden="true" fill="#C43B4A" opacity={0.85}>
          <path d="M 74 30 q 5 -2 6 3 q -4 1 -6 -3" />
          <path d="M 79 24 q 4 -3 6 2 q -4 2 -6 -2" />
        </g>
      );
    case 'thinking':
      return (
        <g aria-hidden="true">
          <circle cx={78} cy={26} r={3} fill="#EDF0F4" opacity={0.95} />
          <circle cx={84} cy={19} r={4} fill="#EDF0F4" opacity={0.95} />
          <circle cx={88} cy={11} r={5.4} fill="#EDF0F4" opacity={0.95} />
          <text x={88} y={14.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="#5E7080">?</text>
        </g>
      );
    case 'winner':
      return (
        <g aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-crown`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFE08A" />
              <stop offset="1" stopColor="#E8A81E" />
            </linearGradient>
          </defs>
          <path d="M 32 16 l 5 -9 l 6 7 l 7 -11 l 7 11 l 6 -7 l 5 9 z" fill={`url(#${uid}-crown)`} stroke="#C08A1E" strokeWidth={1} />
          <circle cx={50} cy={4.5} r={1.8} fill="#E4572E" />
          <g fill="#F2B33D">
            <path d="M 12 36 l 1.2 3 3.2 0.4 -2.4 2.2 0.6 3.2 -2.6 -1.6 -2.6 1.6 0.6 -3.2 -2.4 -2.2 3.2 -0.4 z" />
            <path d="M 88 44 l 1.2 3 3.2 0.4 -2.4 2.2 0.6 3.2 -2.6 -1.6 -2.6 1.6 0.6 -3.2 -2.4 -2.2 3.2 -0.4 z" />
          </g>
        </g>
      );
    case 'bankrupt':
      return (
        <g aria-hidden="true" stroke="#8A8FA8" strokeWidth={2} strokeLinecap="round" opacity={0.85}>
          <path d="M 20 22 q 3 -3 6 0 q 3 3 6 0" fill="none" />
          <path d="M 74 20 q 3 -3 6 0 q 3 3 6 0" fill="none" />
        </g>
      );
    default:
      return null;
  }
  void skin;
}

// ─── Body & assembly ────────────────────────────────────────────────────────

function Body({ look, e }: { look: Look; e: Emotion }): ReactNode {
  const { accent, accentDark, skin, collar } = look;
  const slump = e === 'bankrupt' ? 3 : 0;
  return (
    <g aria-hidden="true" transform={`translate(0 ${slump})`}>
      <path d="M 22 100 q 1 -26 28 -27 q 27 1 28 27 z" fill={accent} />
      <path d="M 22 100 q 1 -26 28 -27 l 0 27 z" fill="rgba(255,255,255,0.14)" />
      <path d="M 50 73 l 8 6 l -8 21 l -8 -21 z" fill={shade(accent, 22)} />
      {collar === 'scarf' && <path d="M 34 78 q 16 8 32 0 l 0 7 q -16 8 -32 0 z" fill={accentDark} />}
      {collar === 'buttons' && (
        <g fill={accentDark}>
          <circle cx={50} cy={84} r={1.8} />
          <circle cx={50} cy={91} r={1.8} />
          <circle cx={50} cy={97.5} r={1.8} />
        </g>
      )}
      {collar === 'zip' && <rect x={49} y={76} width={2.4} height={24} rx={1.2} fill={accentDark} />}
      {collar === 'lapel' && (
        <g fill={accentDark}>
          <path d="M 50 74 l -9 5 l 9 4 z" />
          <path d="M 50 74 l 9 5 l -9 4 z" />
        </g>
      )}
      {collar === 'pocket' && (
        <g>
          <rect x={30} y={86} width={9} height={9} rx={2} fill="rgba(0,0,0,0.16)" />
          <path d="M 30 89 h 9" stroke={shade(accent, 30)} strokeWidth={1.4} />
          <path d="M 66 78 q 6 4 5 12" stroke={shade(accent, 25)} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </g>
      )}
      {collar === 'badge' && <path d="M 62 82 l 2.2 4.6 5 .6 -3.6 3.4 1 4.8 -4.6 -2.4 -4.6 2.4 1 -4.8 -3.6 -3.4 5 -.6 z" fill="#F2B33D" />}
      <rect x={44} y={66} width={12} height={9} rx={4} fill={shade(skin, -12)} />
    </g>
  );
}

export interface PortraitProps {
  characterId: string;
  emotion?: Emotion;
  size?: number | string;
  className?: string;
  label?: string;
}

/**
 * Bust portrait with backdrop. Accessible: role="img" + aria-label by default.
 */
export function CharacterPortrait({ characterId, emotion = 'idle', size = 48, className, label }: PortraitProps): ReactNode {
  const look = LOOKS[characterId] ?? LOOKS.sailor;
  const uid = `ch-${characterId}-${emotion}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? `${characterId} character, ${emotion}`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(look.accent, 30)} />
          <stop offset="1" stopColor={look.accentDark} />
        </linearGradient>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(look.skin, 14)} />
          <stop offset="1" stopColor={shade(look.skin, -8)} />
        </linearGradient>
        <linearGradient id="knightgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx={50} cy={50} r={48} fill={`url(#${uid}-bg)`} />
      <circle cx={50} cy={50} r={48} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
      <ellipse cx={50} cy={96} rx={30} ry={8} fill="rgba(0,0,0,0.18)" />
      <Body look={look} e={emotion} />
      {/* head */}
      <g>
        <ellipse cx={50} cy={48} rx={23} ry={25} fill={`url(#${uid}-skin)`} />
        <ellipse cx={27.5} cy={50} rx={4} ry={5} fill={look.skin} />
        <ellipse cx={72.5} cy={50} rx={4} ry={5} fill={look.skin} />
        <ellipse cx={50} cy={57} rx={11} ry={8} fill={shade(look.skin, 10)} opacity={0.5} />
      </g>
      <Hair look={look} />
      <Hat look={look} e={emotion} />
      <Blush e={emotion} skin={look.skin} />
      <Eyes e={emotion} skin={look.skin} look={look} />
      <Mouth e={emotion} />
      <Overlay e={emotion} skin={look.skin} uid={uid} />
    </svg>
  );
}

/**
 * Board pawn — standing 3D-look token matching the character.
 * viewBox 0 0 60 80; drop shadow + idle bob handled by parent animation.
 */
export function Pawn({ characterId, size = 34, className, label, celebration = false }: { characterId: string; size?: number | string; className?: string; label?: string; celebration?: boolean }): ReactNode {
  const look = LOOKS[characterId] ?? LOOKS.sailor;
  const uid = `pawn-${characterId}`;
  return (
    <svg viewBox="0 0 60 80" width={size} height={size} className={className} role="img" aria-label={label ?? `${characterId} pawn`}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(look.accent, 22)} />
          <stop offset="0.6" stopColor={look.accent} />
          <stop offset="1" stopColor={look.accentDark} />
        </linearGradient>
        <radialGradient id={`${uid}-head`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={shade(look.skin, 18)} />
          <stop offset="1" stopColor={shade(look.skin, -6)} />
        </radialGradient>
      </defs>
      <ellipse cx={30} cy={73} rx={17} ry={5.5} fill="#141428" opacity={0.22} />
      {/* base */}
      <ellipse cx={30} cy={69} rx={15} ry={5.5} fill={look.accentDark} />
      <ellipse cx={30} cy={67} rx={15} ry={5.5} fill={`url(#${uid}-body)`} />
      {/* body cone */}
      <path d="M 19 66 q 2 -22 11 -26 q 9 4 11 26 q -11 5 -22 0" fill={`url(#${uid}-body)`} />
      <path d="M 19 66 q 2 -22 11 -26 l 0 25 q -5 2 -11 1" fill="rgba(255,255,255,0.16)" />
      {/* collar ring */}
      <ellipse cx={30} cy={41.5} rx={8.5} ry={3.4} fill={shade(look.accentDark, 8)} />
      {/* head */}
      <circle cx={30} cy={31} r={11.5} fill={`url(#${uid}-head)`} />
      {/* mini face */}
      {celebration ? (
        <g aria-hidden="true">
          <path d="M 25 30 q 2.4 -3 4.8 0" stroke="#26243B" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d="M 31.5 30 q 2.4 -3 4.8 0" stroke="#26243B" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d="M 27 35.5 q 3 3 6 0" stroke="#26243B" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g aria-hidden="true">
          <circle cx={26.5} cy={30.5} r={1.4} fill="#26243B" />
          <circle cx={33.5} cy={30.5} r={1.4} fill="#26243B" />
          <path d="M 27.5 35 q 2.5 2 5 0" stroke="#26243B" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </g>
      )}
      {/* hat mini per type */}
      <MiniHat hat={look.hat} accent={look.accent} accentDark={look.accentDark} />
      {celebration && (
        <g aria-hidden="true">
          <path d="M 20 15 l 3 -6 l 4 4.5 l 3.5 -7 l 3.5 7 l 4 -4.5 l 3 6 z" fill="#F2B33D" stroke="#C08A1E" strokeWidth={0.8} />
        </g>
      )}
    </svg>
  );
}

function MiniHat({ hat, accent, accentDark }: { hat: Look['hat']; accent: string; accentDark: string }): ReactNode {
  switch (hat) {
    case 'toque': return <path d="M 21 24 q 0 -8 9 -8 q 9 0 9 8 z" fill="#F4F6F8" />;
    case 'sailor': return <path d="M 21 25 q 0 -8 9 -8 q 9 0 9 8 z" fill="#F4F6F8" />;
    case 'helmet': return <path d="M 20 26 q 0 -11 10 -11 q 10 0 10 11 z" fill={accent} />;
    case 'deerstalker': return <path d="M 21 25 q 0 -9 9 -9 q 9 0 9 9 z" fill={accentDark} />;
    case 'space': return <circle cx={30} cy={26} r={13} fill="#DDEFFF" opacity={0.45} />;
    case 'beret': return <path d="M 21 24 q 2 -8 10 -8 q 8 0 9 8 q -9 -3 -19 0" fill={accent} />;
    case 'pith': return <path d="M 21 25 q 0 -9 9 -9 q 9 0 9 9 z" fill="#F4EFE6" />;
    case 'racing': return <path d="M 20 26 q 0 -11 10 -11 q 10 0 10 11 z" fill={accent} />;
    case 'goggles': return <rect x={22} y={19} width={16} height={7} rx={3.5} fill="#5E7080" />;
    case 'knight': return <path d="M 21 25 q 0 -11 9 -11 q 9 0 9 11 z" fill="#B8C2CC" />;
    case 'tricorne': return <path d="M 19 24 q 11 -7 22 0 q -11 -3 -22 0" fill="#2E2A38" />;
    case 'fez': return <path d="M 22 24 l 1.5 -8 q 6.5 -2 13 0 l 1.5 8 q -8 2.5 -16 0" fill={accent} />;
    default: return null;
  }
}
