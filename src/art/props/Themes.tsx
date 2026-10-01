/**
 * Empire City — board themes: Classic City, Neon Night, Ancient Empire.
 * Each theme provides center artwork + ambient page background + frame tint.
 */
import type { ReactNode } from 'react';
import { Grad, Specular, shade } from '../primitives';

export type ThemeId = 'classic' | 'neon' | 'ancient';

export interface ThemeDef {
  id: ThemeId;
  nameKey: string;
  bgFrom: string;
  bgTo: string;
  boardFelt: string;
  frameColor: string;
  tileFace: string;
  inkOnFelt: string;
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  classic: {
    id: 'classic', nameKey: 'theme.classic',
    bgFrom: '#F4EFE6', bgTo: '#E4D8C4',
    boardFelt: '#2E7D5B', frameColor: '#7A5230', tileFace: '#F8F4EA', inkOnFelt: '#FFF6DC',
  },
  neon: {
    id: 'neon', nameKey: 'theme.neon',
    bgFrom: '#171226', bgTo: '#0E0B18',
    boardFelt: '#221A38', frameColor: '#7C5CFF', tileFace: '#2A2144', inkOnFelt: '#E8DCFF',
  },
  ancient: {
    id: 'ancient', nameKey: 'theme.ancient',
    bgFrom: '#EFE3C8', bgTo: '#D8C49A',
    boardFelt: '#B0883E', frameColor: '#6B4A26', tileFace: '#F5EBD0', inkOnFelt: '#5E4620',
  },
};

/** Ambient page background with soft clouds/gradient per theme. */
export function AmbientBackground({ theme, label }: { theme: ThemeId; label?: string }): ReactNode {
  const t = THEMES[theme];
  const uid = `amb-${theme}`;
  return (
    <svg
      className="ec-ambient-bg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
      role="img" aria-label={label ?? 'Ambient background'}
    >
      <defs>
        <Grad id={`${uid}-bg`} from={t.bgFrom} to={t.bgTo} />
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
      {theme === 'classic' && (
        <g aria-hidden="true" opacity={0.5}>
          <ellipse cx={20} cy={14} rx={16} ry={4} fill="#fff" opacity={0.5} />
          <ellipse cx={70} cy={22} rx={20} ry={5} fill="#fff" opacity={0.4} />
          <g fill={shade(t.bgTo, -14)}>
            <rect x={6} y={64} width={7} height={30} rx={1.5} />
            <rect x={15} y={56} width={6} height={38} rx={1.5} />
            <rect x={80} y={60} width={7} height={34} rx={1.5} />
            <rect x={89} y={68} width={6} height={26} rx={1.5} />
          </g>
        </g>
      )}
      {theme === 'neon' && (
        <g aria-hidden="true">
          {[[14, 20], [50, 12], [82, 26], [30, 40], [68, 46]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.6} fill="#B48AE8" opacity={0.8} className="ec-anim-twinkle" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
          <g stroke="#7C5CFF" opacity={0.35} fill="none">
            <rect x={8} y={58} width={10} height={36} rx={1} />
            <rect x={82} y={54} width={11} height={40} rx={1} />
          </g>
          <g stroke="#E4572E" opacity={0.28} fill="none">
            <rect x={20} y={66} width={8} height={28} rx={1} />
          </g>
        </g>
      )}
      {theme === 'ancient' && (
        <g aria-hidden="true" opacity={0.4}>
          <path d="M 8 88 L 14 60 L 20 88 Z" fill={shade(t.bgTo, -22)} />
          <path d="M 78 88 L 86 54 L 94 88 Z" fill={shade(t.bgTo, -22)} />
          <circle cx={50} cy={16} r={9} fill="#E8B84A" opacity={0.5} />
        </g>
      )}
    </svg>
  );
}

/** Center-of-board artwork per theme. */
export function BoardCenter({ theme, size = '100%', label }: { theme: ThemeId; size?: number | string; label?: string }): ReactNode {
  const uid = `bc-${theme}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label ?? 'Board center artwork'}>
      <defs>
        <Grad id={`${uid}-disc`} from={theme === 'neon' ? '#3A2C60' : theme === 'ancient' ? '#C8A860' : '#3E9C74'} to={theme === 'neon' ? '#241C40' : theme === 'ancient' ? '#A0823E' : '#2E7D5B'} />
        <Grad id={`${uid}-city`} from={theme === 'neon' ? '#E4572E' : '#F4EFE6'} to={theme === 'neon' ? '#B23A18' : '#C4B8A8'} />
      </defs>
      <circle cx={100} cy={100} r={94} fill={`url(#${uid}-disc)`} />
      <circle cx={100} cy={100} r={94} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} />
      <circle cx={100} cy={100} r={78} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.4} strokeDasharray="4 6" />
      {theme === 'classic' && (
        <g>
          {/* skyline silhouette */}
          <g fill={`url(#${uid}-city)`} opacity={0.92}>
            <rect x={54} y={78} width={16} height={54} rx={2} />
            <rect x={74} y={64} width={20} height={68} rx={2.5} />
            <rect x={98} y={72} width={16} height={60} rx={2} />
            <rect x={118} y={58} width={22} height={74} rx={2.5} />
            <path d="M 40 132 L 46 108 L 52 132 Z" />
            <path d="M 148 132 L 156 102 L 164 132 Z" />
          </g>
          <g fill="#FFF6DC" opacity={0.85}>
            {[58, 62].map((x) => <rect key={x} x={x} y={86} width={4} height={5} rx={0.8} />)}
            {[79, 85, 88].map((x) => <rect key={x} x={x} y={72} width={4.4} height={5.4} rx={0.8} />)}
            {[102, 107].map((x) => <rect key={x} x={x} y={80} width={4} height={5} rx={0.8} />)}
            {[123, 129, 133].map((x) => <rect key={x} x={x} y={66} width={4.6} height={5.6} rx={0.8} />)}
          </g>
          <g className="ec-anim-bob" aria-hidden="true">
            <path d="M 129 58 l 0 -10 M 125 50 l 8 3 l -8 3" stroke="#F2B33D" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </g>
          <Specular x={70} y={70} w={30} h={10} opacity={0.18} />
          <text x={100} y={152} textAnchor="middle" fontSize={15} fontWeight={800} fill="#FFF6DC" letterSpacing={2}>EMPIRE CITY</text>
        </g>
      )}
      {theme === 'neon' && (
        <g>
          <g fill="none" strokeWidth={2.4}>
            <rect x={60} y={72} width={16} height={58} rx={2} stroke="#7C5CFF" />
            <rect x={82} y={60} width={20} height={70} rx={2} stroke="#E4572E" />
            <rect x={108} y={70} width={18} height={60} rx={2} stroke="#4FA8D8" />
            <rect x={130} y={82} width={14} height={48} rx={2} stroke="#D86FA4" />
          </g>
          <g className="ec-anim-twinkle">
            <circle cx={70} cy={66} r={2} fill="#B48AE8" />
            <circle cx={92} cy={52} r={2.4} fill="#FF9A70" />
            <circle cx={117} cy={64} r={2} fill="#7FC4E8" />
          </g>
          <text x={100} y={152} textAnchor="middle" fontSize={15} fontWeight={800} fill="#E8DCFF" letterSpacing={2}>EMPIRE CITY</text>
        </g>
      )}
      {theme === 'ancient' && (
        <g>
          <g fill={`url(#${uid}-city)`} opacity={0.95}>
            <path d="M 50 132 L 60 96 L 70 132 Z" />
            <path d="M 130 132 L 142 90 L 154 132 Z" />
            <rect x={84} y={84} width={32} height={48} rx={3} />
            <path d="M 78 86 Q 100 62 122 86 Z" />
          </g>
          <path d="M 100 46 l 3 8 8.6 1 -6.4 6 1.8 8.6 -7 -4 -7 4 1.8 -8.6 -6.4 -6 8.6 -1 z" fill="#FFF3C4" opacity={0.95} />
          <text x={100} y={152} textAnchor="middle" fontSize={15} fontWeight={800} fill="#FFF6DC" letterSpacing={2}>EMPIRE CITY</text>
        </g>
      )}
    </svg>
  );
}
