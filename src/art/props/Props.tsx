/**
 * Empire City — prop illustrations: buildings, dice, money, card icons,
 * auction hammer, trophy, confetti, theme backdrops.
 */
import type { ReactNode } from 'react';
import { shade, Grad, Specular } from '../primitives';

// ─── Buildings ──────────────────────────────────────────────────────────────

export function HouseIcon({ size = 16, tint, pop = false, label }: { size?: number; tint?: string; pop?: boolean; label?: string }): ReactNode {
  const body = tint ? shade(tint, 20) : '#3FA65C';
  const roof = tint ? shade(tint, -6) : '#2C7A42';
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label ?? 'House'} className={pop ? 'ec-anim-pop' : undefined}>
      <defs><Grad id="hb-std" from={shade(body, 16)} to={shade(body, -8)} /></defs>
      <ellipse cx={12} cy={21} rx={8} ry={2.2} fill="#141428" opacity={0.18} />
      <rect x={5} y={10} width={14} height={11} rx={2} fill="url(#hb-std)" />
      <path d="M 3.5 11 L 12 3 L 20.5 11 Z" fill={roof} />
      <rect x={10.6} y={14} width={2.8} height={4} rx={0.8} fill="#FFF7E0" />
      <Specular x={8.4} y={13} w={4} h={2} opacity={0.25} />
    </svg>
  );
}

export function HotelIcon({ size = 18, tint, pop = false, label }: { size?: number; tint?: string; pop?: boolean; label?: string }): ReactNode {
  const body = tint ? shade(tint, 12) : '#D64550';
  const roof = tint ? shade(tint, -14) : '#9E2B36';
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label ?? 'Hotel'} className={pop ? 'ec-anim-pop' : undefined}>
      <defs><Grad id="hb-hot" from={shade(body, 14)} to={shade(body, -10)} /></defs>
      <ellipse cx={12} cy={21.5} rx={9} ry={2} fill="#141428" opacity={0.18} />
      <rect x={4} y={7} width={16} height={14} rx={2} fill="url(#hb-hot)" />
      <path d="M 2.5 8.5 L 12 1.5 L 21.5 8.5 Z" fill={roof} />
      <rect x={2.5} y={7.4} width={19} height={1.8} rx={0.9} fill="#F2B33D" />
      {[10.5, 14.5].map((y) => [7.5, 11.5, 15.5].map((x) => (
        <rect key={`${x}${y}`} x={x} y={y} width={2.2} height={2.6} rx={0.5} fill="#FFF7E0" />
      )))}
      <Specular x={8} y={10} w={5} h={2.4} opacity={0.25} />
    </svg>
  );
}

export function MortgageStamp({ size = 22, label }: { size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 40 24" width={size * 1.6} height={size} role="img" aria-label={label ?? 'Mortgaged'}>
      <rect x={1} y={1} width={38} height={22} rx={4} fill="none" stroke="#D64550" strokeWidth={2.4} opacity={0.9} transform="rotate(-8 20 12)" />
      <text x={20} y={16} textAnchor="middle" fontSize={9} fontWeight={800} fill="#D64550" transform="rotate(-8 20 12)">MTG</text>
    </svg>
  );
}

export function OwnerFlag({ color, size = 14, label }: { color: string; size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 20 24" width={size} height={size * 1.2} role="img" aria-label={label ?? 'Owned'}>
      <path d="M 5 2 L 5 22" stroke="#5E6A78" strokeWidth={2} strokeLinecap="round" />
      <path d="M 5 3 L 16 6.5 L 5 10 Z" fill={color} />
      <path d="M 5 3 L 10.5 4.7 L 5 6.5 Z" fill={shade(color, 22)} />
    </svg>
  );
}

// ─── Dice ───────────────────────────────────────────────────────────────────

export function DiceFace({ n, uid }: { n: number; uid: string }): ReactNode {
  const pips: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
  };
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-d${n}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E2DDF0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={18} fill={`url(#${uid}-d${n})`} />
      <rect x={4} y={4} width={92} height={92} rx={15} fill="none" stroke="rgba(90,80,130,0.25)" strokeWidth={3} />
      {pips[n].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={9.5} fill="#E4572E" />
          <circle cx={x - 2.4} cy={y - 2.4} r={3} fill="#FF9A70" opacity={0.85} />
        </g>
      ))}
    </>
  );
}

// ─── Money ──────────────────────────────────────────────────────────────────

export function Bill({ value = 100, size = 26, label }: { value?: number; size?: number; label?: string }): ReactNode {
  const colors: Record<number, [string, string]> = {
    1: ['#9AA5B1', '#6E7A87'], 5: ['#C43B4A', '#922834'], 10: ['#4A9E5C', '#337A43'],
    20: ['#4FA8D8', '#2E7EA8'], 50: ['#7C5CFF', '#5A3FD1'], 100: ['#E8B84A', '#C08A1E'],
    500: ['#E4572E', '#B23A18'], 1000: ['#F2B33D', '#C08A1E'],
  };
  const [c1, c2] = colors[value] ?? colors[100];
  return (
    <svg viewBox="0 0 40 22" width={size} height={(size * 22) / 40} role="img" aria-label={label ?? `${value} dollar bill`}>
      <defs><Grad id={`bill${value}`} from={c1} to={c2} /></defs>
      <rect x={1} y={1} width={38} height={20} rx={3} fill={`url(#bill${value})`} stroke={shade(c2, -12)} strokeWidth={1} />
      <rect x={4.5} y={4} width={31} height={14} rx={2} fill="none" stroke="#FFF3D6" strokeWidth={0.8} opacity={0.7} />
      <circle cx={20} cy={11} r={5.5} fill="#FFF3D6" opacity={0.85} />
      <text x={20} y={14} textAnchor="middle" fontSize={7} fontWeight={800} fill={c2}>{value}</text>
      <text x={8} y={14} fontSize={6} fontWeight={700} fill="#FFF3D6" opacity={0.9}>E</text>
      <text x={30} y={14} fontSize={6} fontWeight={700} fill="#FFF3D6" opacity={0.9}>C</text>
    </svg>
  );
}

export function Coin({ size = 14, label }: { size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} role="img" aria-label={label ?? 'Coin'}>
      <defs><Grad id="coin" from="#FFE08A" to="#E8A81E" /></defs>
      <circle cx={10} cy={10} r={9} fill="url(#coin)" stroke="#C08A1E" strokeWidth={1} />
      <circle cx={10} cy={10} r={6} fill="none" stroke="#FFF3C4" strokeWidth={1.2} opacity={0.8} />
      <text x={10} y={13.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#8A5E10">$</text>
      <Specular x={7} y={6.5} w={5} h={2.6} opacity={0.5} />
    </svg>
  );
}

export function JailFreeCard({ size = 40, label }: { size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 60 40" width={size} height={(size * 40) / 60} role="img" aria-label={label ?? 'Get out of jail card'}>
      <defs><Grad id="jfc" from="#FFD98E" to="#E8A81E" /></defs>
      <rect x={1} y={1} width={58} height={38} rx={5} fill="url(#jfc)" stroke="#C08A1E" strokeWidth={1.4} />
      <rect x={5} y={5} width={50} height={30} rx={3} fill="none" stroke="#FFF3C4" strokeWidth={1} opacity={0.8} />
      <path d="M 30 10 l 2.6 6 6.4 0.6 -4.8 4.4 1.4 6.4 -5.6 -3.4 -5.6 3.4 1.4 -6.4 -4.8 -4.4 6.4 -0.6 z" fill="#7C3A10" opacity={0.85} />
      <text x={30} y={34} textAnchor="middle" fontSize={5.4} fontWeight={800} fill="#7C3A10">JAIL FREE</text>
    </svg>
  );
}

// ─── Card faces / backs ─────────────────────────────────────────────────────

export function CardBack({ deck, size = 60, label }: { deck: 'chance' | 'chest'; size?: number; label?: string }): ReactNode {
  const purple = deck === 'chance';
  return (
    <svg viewBox="0 0 60 84" width={size} height={(size * 84) / 60} role="img" aria-label={label ?? (purple ? 'Chance card back' : 'Community chest card back')}>
      <defs>
        <Grad id={`cb-${deck}`} from={purple ? '#8A6BD8' : '#E8A05A'} to={purple ? '#5A3FB0' : '#C47A32'} />
      </defs>
      <rect x={1} y={1} width={58} height={82} rx={6} fill={`url(#cb-${deck})`} stroke={purple ? '#4C36A8' : '#A8641E'} strokeWidth={2} />
      <rect x={6} y={6} width={48} height={72} rx={4} fill="none" stroke="#FFF3D6" strokeWidth={1.2} opacity={0.65} />
      {purple ? (
        <g>
          <circle cx={30} cy={38} r={14} fill="#B48AE8" opacity={0.9} />
          <path d="M 20 34 q 8 -10 20 -3 q -7 -2 -12 3 q -5 4 -8 0" fill="#fff" opacity={0.5} />
          <text x={30} y={66} textAnchor="middle" fontSize={8} fontWeight={800} fill="#FFF3D6">CHANCE</text>
        </g>
      ) : (
        <g>
          <rect x={16} y={36} width={28} height={16} rx={3} fill="#B8804A" />
          <path d="M 16 38 q 0 -10 14 -10 q 14 0 14 10 z" fill={shade('#B8804A', 14)} />
          <rect x={16} y={42} width={28} height={3} fill="#F2B33D" />
          <text x={30} y={66} textAnchor="middle" fontSize={7} fontWeight={800} fill="#FFF3D6">COMMUNITY</text>
        </g>
      )}
      <text x={30} y={76} textAnchor="middle" fontSize={7} fontWeight={700} fill="#FFF3D6" opacity={0.85}>EMPIRE CITY</text>
    </svg>
  );
}

// ─── FX ─────────────────────────────────────────────────────────────────────

export function AuctionHammer({ size = 40, label }: { size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role="img" aria-label={label ?? 'Auction hammer'}>
      <defs><Grad id="ham" from="#C4A86A" to="#8A6B4A" /></defs>
      <ellipse cx={24} cy={42} rx={14} ry={3.4} fill="#141428" opacity={0.15} />
      <rect x={21.6} y={16} width={5} height={26} rx={2.4} fill="url(#ham)" transform="rotate(24 24 29)" />
      <rect x={12} y={8} width={22} height={12} rx={4} fill="#6E7A87" transform="rotate(24 23 14)" />
      <rect x={12} y={8} width={22} height={5} rx={2.5} fill="#8A9BA8" transform="rotate(24 23 14)" />
      <rect x={31} y={10} width={4} height={9} rx={2} fill="#F2B33D" transform="rotate(24 33 14)" />
    </svg>
  );
}

export function Trophy({ size = 64, label }: { size?: number; label?: string }): ReactNode {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={label ?? 'Trophy'}>
      <defs><Grad id="troph" from="#FFE08A" to="#E8A81E" /></defs>
      <ellipse cx={32} cy={58} rx={16} ry={3.4} fill="#141428" opacity={0.16} />
      <path d="M 20 10 h 24 v 14 a 12 12 0 0 1 -24 0 z" fill="url(#troph)" stroke="#C08A1E" strokeWidth={1.4} />
      <path d="M 20 14 q -10 2 -6 12 q 3 7 10 5" fill="none" stroke="#E8A81E" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M 44 14 q 10 2 6 12 q -3 7 -10 5" fill="none" stroke="#E8A81E" strokeWidth={3.4} strokeLinecap="round" />
      <rect x={29} y={34} width={6} height={9} fill="#E8A81E" />
      <path d="M 22 48 h 20 l 3 6 h -26 z" fill="#C08A1E" />
      <path d="M 26 16 q 6 6 12 0" stroke="#FFF3C4" strokeWidth={2} fill="none" opacity={0.8} />
      <Specular x={26} y={14} w={8} h={4} opacity={0.5} />
    </svg>
  );
}

export function Confetti({ pieces = 28, seed = 1 }: { pieces?: number; seed?: number }): ReactNode {
  const colors = ['#E4572E', '#F2B33D', '#4A9E5C', '#4FA8D8', '#D86FA4', '#7C5CFF'];
  const items: ReactNode[] = [];
  const rnd = (i: number, salt: number): number =>
    (((seed * 9301 + i * 49297 + salt * 7919) % 233280) + 233280) % 233280 / 233280;
  for (let i = 0; i < pieces; i++) {
    const x = rnd(i, 1) * 100;
    const delay = rnd(i, 2) * 1.2;
    const dur = 1.4 + rnd(i, 3) * 0.9;
    const color = colors[i % colors.length];
    items.push(
      <rect
        key={i} x={x} y={-6} width={2.6} height={5} rx={0.8} fill={color}
        className="ec-confetti"
        style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s`, transformOrigin: `${x}px 0px` }}
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ec-confetti-layer" aria-hidden="true">
      {items}
    </svg>
  );
}
