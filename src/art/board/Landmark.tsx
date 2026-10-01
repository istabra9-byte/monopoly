/**
 * Empire City — landmark illustrations for all 40 board spaces.
 * Each space has a unique, shape-recognizable scene in a 100×100 viewBox.
 * Style: soft-3D vector, top-left light, gradients, soft shadows (style guide).
 */
import type { ReactNode } from 'react';
import { shade, Grad, Window, Door, Tree, Water, Road, Banner, Specular } from '../primitives';
import { DISTRICTS } from '../../data/board';
import type { DistrictId } from '../../engines/types';

// ─── micro building blocks ──────────────────────────────────────────────────

function Tower({ uid, x, y, w, h, base, roofColor, windows = 3, spire = false, domeColor }: {
  uid: string; x: number; y: number; w: number; h: number; base: string; roofColor?: string; windows?: number; spire?: boolean; domeColor?: string;
}): ReactNode {
  const rows = windows;
  const wins: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    wins.push(<Window key={r} x={x + w * 0.22} y={y + 8 + r * ((h - 14) / Math.max(1, rows))} w={w * 0.24} h={Math.min(8, (h - 16) / rows - 1)} />);
    wins.push(<Window key={`b${r}`} x={x + w * 0.56} y={y + 8 + r * ((h - 14) / Math.max(1, rows))} w={w * 0.24} h={Math.min(8, (h - 16) / rows - 1)} />);
  }
  return (
    <g aria-hidden="true">
      <defs>
        <Grad id={`${uid}-b`} from={shade(base, 16)} to={shade(base, -10)} />
      </defs>
      {spire && <path d={`M ${x + w / 2} ${y - 12} L ${x + w / 2 + 2.5} ${y} L ${x + w / 2 - 2.5} ${y} Z`} fill={roofColor ?? shade(base, -25)} />}
      <rect x={x} y={y} width={w} height={h} rx={2.5} fill={`url(#${uid}-b)`} />
      {wins}
      {domeColor && <path d={`M ${x - 1.5} ${y} a ${w / 2 + 1.5} ${w / 3.2} 0 0 1 ${w + 3} 0 z`} fill={domeColor} />}
      {roofColor && !domeColor && <path d={`M ${x - 2} ${y} L ${x + w / 2} ${y - 9} L ${x + w + 2} ${y} Z`} fill={roofColor} />}
      <Specular x={x + w * 0.3} y={y + h * 0.22} w={w * 0.3} h={h * 0.14} opacity={0.22} />
    </g>
  );
}

function House({ uid, x, y, w, h, base, roof }: { uid: string; x: number; y: number; w: number; h: number; base: string; roof: string }): ReactNode {
  return (
    <g aria-hidden="true">
      <defs><Grad id={`${uid}-hb`} from={shade(base, 14)} to={shade(base, -8)} /></defs>
      <rect x={x} y={y} width={w} height={h} rx={2} fill={`url(#${uid}-hb)`} />
      <path d={`M ${x - 3} ${y} L ${x + w / 2} ${y - h * 0.55} L ${x + w + 3} ${y} Z`} fill={roof} />
      <Window x={x + w * 0.3} y={y + h * 0.3} w={w * 0.4} h={h * 0.34} />
    </g>
  );
}

function Ground({ fill = '#8FBF7A' }: { fill?: string }): ReactNode {
  return <rect x={0} y={78} width={100} height={22} fill={fill} />;
}

// ─── Landmark scenes ────────────────────────────────────────────────────────

const SCENES: Record<string, (uid: string, d?: DistrictId) => ReactNode> = {
  // ── corners & specials ──
  startgate: (uid) => (
    <g>
      <defs><Grad id={`${uid}-gate`} from="#E4572E" to="#B23A18" /></defs>
      <Ground fill="#A8D8A0" />
      <Road y={80} />
      <rect x={8} y={22} width={12} height={56} rx={5} fill={`url(#${uid}-gate)`} />
      <rect x={80} y={22} width={12} height={56} rx={5} fill={`url(#${uid}-gate)`} />
      <path d="M 8 24 Q 50 -2 92 24 L 92 34 Q 50 10 8 34 Z" fill={`url(#${uid}-gate)`} />
      <circle cx={50} cy={26} r={8.5} fill="#F2B33D" />
      <text x={50} y={30.5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#7C3A10">GO</text>
      <path d="M 34 62 L 50 50 L 66 62 L 66 78 L 34 78 Z" fill="#FFF3D6" opacity={0.9} />
      <g className="ec-anim-arrow" aria-hidden="true">
        <path d="M 50 56 l 7 9 l -4.4 0 l 0 8 l -5.2 0 l 0 -8 l -4.4 0 z" fill="#E4572E" />
      </g>
      <Specular x={14} y={30} w={7} h={20} rot={0} opacity={0.3} />
    </g>
  ),
  jail: (uid) => (
    <g>
      <defs><Grad id={`${uid}-jl`} from="#9AA5B1" to="#5E6A78" /></defs>
      <Ground fill="#8FBF7A" />
      <rect x={18} y={30} width={64} height={48} rx={4} fill={`url(#${uid}-jl)`} />
      <path d="M 14 32 L 50 14 L 86 32 Z" fill="#6E7A87" />
      <rect x={26} y={44} width={48} height={34} rx={2} fill="rgba(20,20,40,0.35)" />
      {[32, 41, 50, 59, 68].map((x) => <rect key={x} x={x} y={44} width={2.6} height={34} fill="#C8CDD6" opacity={0.9} />)}
      <rect x={47} y={70} width={6} height={8} rx={1} fill="#F2B33D" />
      <text x={50} y={27} textAnchor="middle" fontSize={9} fontWeight={800} fill="#F4EFE6">JAIL</text>
      <Specular x={36} y={22} w={16} h={6} opacity={0.35} />
    </g>
  ),
  garden: (uid) => (
    <g>
      <Ground fill="#8FBF7A" />
      <Water y={84} height={16} fill="#9CD08A" />
      <circle cx={50} cy={64} r={20} fill="#79B768" />
      <circle cx={50} cy={64} r={14} fill="#F2B33D" opacity={0.9} />
      <Tree x={24} y={72} s={1.1} />
      <Tree x={76} y={72} s={0.9} />
      <Tree x={38} y={80} s={0.7} />
      <Tree x={63} y={81} s={0.8} />
      <defs><Grad id={`${uid}-f`} from="#FFE08A" to="#F2B33D" /></defs>
      <circle cx={50} cy={64} r={7} fill={`url(#${uid}-f)`} />
      <path d="M 50 52 q 5 8 0 24 q -5 -16 0 -24" fill="#FFF6DC" opacity={0.7} />
    </g>
  ),
  patrol: (uid) => (
    <g>
      <defs><Grad id={`${uid}-p`} from="#5A7D9A" to="#3D5A73" /></defs>
      <Ground fill="#8FBF7A" />
      <Road y={82} />
      <circle cx={50} cy={30} r={11} fill={`url(#${uid}-p)`} />
      <path d="M 39 30 a 11 11 0 0 1 22 0" fill="#26243B" opacity={0.75} />
      <rect x={40} y={42} width={20} height={26} rx={7} fill={`url(#${uid}-p)`} />
      <circle cx={50} cy={52} r={5} fill="#F2B33D" />
      <path d="M 50 47 l 2 3.4 l 3.6 .5 -2.6 2.5 .7 3.6 -3.7 -1.9 -3.7 1.9 .7 -3.6 -2.6 -2.5 3.6 -.5 z" fill="#B23A18" />
      <g className="ec-anim-siren" aria-hidden="true">
        <circle cx={50} cy={16} r={4} fill="#E4572E" opacity={0.85} />
        <circle cx={50} cy={16} r={7.5} fill="#E4572E" opacity={0.3} />
      </g>
      <Window x={30} y={56} w={7} h={8} fill="#FFD98E" />
    </g>
  ),
  taxoffice: (uid) => (
    <g>
      <defs><Grad id={`${uid}-t`} from="#B8B0C4" to="#8A8098" /></defs>
      <Ground fill="#A8C4B0" />
      <rect x={22} y={32} width={56} height={46} rx={4} fill={`url(#${uid}-t)`} />
      <path d="M 18 34 L 50 18 L 82 34 Z" fill="#6B6280" />
      <circle cx={50} cy={36} r={9} fill="#F2B33D" />
      <text x={50} y={40} textAnchor="middle" fontSize={10} fontWeight={800} fill="#7C3A10">$</text>
      <Door x={44} y={60} w={12} h={18} fill="#4C4460" />
      <Window x={29} y={44} w={9} h={9} />
      <Window x={62} y={44} w={9} h={9} />
    </g>
  ),
  jewel: (uid) => (
    <g>
      <defs>
        <Grad id={`${uid}-j`} from="#BFE4F5" to="#5A9AC4" />
      </defs>
      <Ground fill="#C4B8D8" />
      <path d="M 50 22 L 74 44 L 50 78 L 26 44 Z" fill={`url(#${uid}-j)`} />
      <path d="M 50 22 L 62 44 L 50 78 L 38 44 Z" fill="#E4F4FC" opacity={0.7} />
      <path d="M 26 44 L 38 44 L 50 78 Z" fill="#8FC8E8" opacity={0.8} />
      <Specular x={42} y={34} w={12} h={7} rot={-30} opacity={0.7} />
      <circle cx={50} cy={48} r={26} fill="none" stroke="#F2B33D" strokeWidth={2} opacity={0.5} />
    </g>
  ),
  chest: (uid) => (
    <g>
      <defs><Grad id={`${uid}-c`} from="#B8804A" to="#8A5A2E" /></defs>
      <Ground fill="#A8C4B0" />
      <ellipse cx={50} cy={70} rx={30} ry={10} fill="#141428" opacity={0.15} />
      <rect x={22} y={46} width={56} height={26} rx={4} fill={`url(#${uid}-c)`} />
      <path d="M 22 48 q 0 -16 28 -16 q 28 0 28 16 z" fill={shade('#B8804A', 12)} />
      <rect x={22} y={52} width={56} height={5} fill="#F2B33D" />
      <rect x={45} y={48} width={10} height={16} rx={2} fill="#F2B33D" />
      <circle cx={50} cy={58} r={2.2} fill="#7C3A10" />
      <g className="ec-anim-sparkle" fill="#FFE08A">
        <path d="M 16 34 l 1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 z" />
        <path d="M 84 28 l 1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 z" />
        <path d="M 74 12 l 1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 z" />
      </g>
    </g>
  ),
  orb: (uid) => (
    <g>
      <defs>
        <radialGradient id={`${uid}-o`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#B48AE8" />
          <stop offset="0.55" stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#4C36A8" />
        </radialGradient>
      </defs>
      <Ground fill="#B0A4C8" />
      <ellipse cx={50} cy={74} rx={22} ry={6} fill="#141428" opacity={0.18} />
      <circle cx={50} cy={50} r={24} fill={`url(#${uid}-o)`} />
      <path d="M 36 44 q 10 -12 26 -4 q -8 -4 -16 2 q -6 5 -10 2" fill="#fff" opacity={0.4} />
      <path d="M 40 60 q 12 6 22 -4" stroke="#E8DCFF" strokeWidth={2.4} fill="none" opacity={0.6} />
      <Specular x={42} y={38} w={11} h={6} rot={-28} opacity={0.55} />
      <g className="ec-anim-sparkle" fill="#E8DCFF">
        <path d="M 74 26 l 1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 z" />
      </g>
    </g>
  ),

  // ── Old Docks ──
  harborrow: (uid, d) => (
    <g>
      <Water y={66} />
      {HarborGround(d)}
      <House uid={uid} x={12} y={40} w={26} h={26} base="#A87848" roof="#7A5230" />
      <House uid={`${uid}2`} x={48} y={46} w={22} h={20} base={shade('#A87848', -8)} roof="#7A5230" />
      <path d="M 14 72 h 72" stroke="#7A5230" strokeWidth={4} strokeLinecap="round" />
      <path d="M 18 76 h 64" stroke="#7A5230" strokeWidth={2.4} opacity={0.6} strokeLinecap="round" />
      <rect x={70} y={52} width={12} height={14} rx={2} fill="#8A6B4A" />
      <path d="M 70 52 h 12 M 70 58 h 12" stroke="#5E4630" strokeWidth={1.4} />
    </g>
  ),
  wharf: (uid, d) => (
    <g>
      <Water y={60} />
      {HarborGround(d)}
      <path d="M 20 78 L 34 60 L 76 60 L 84 78 Z" fill="#8A6B4A" />
      <path d="M 30 70 h 46" stroke="#5E4630" strokeWidth={1.6} opacity={0.7} />
      <path d="M 44 60 L 40 40 l 20 0 l -4 20" fill="#A87848" />
      <path d="M 40 40 l 20 0 l 4 -6 l -28 0 z" fill="#7A5230" />
      <circle cx={50} cy={30} r={3.4} fill="#F2B33D" />
      <g aria-hidden="true">
        <path d="M 62 66 q 8 -12 16 0 q -8 8 -16 0" fill="#E8B06B" />
        <circle cx={70} cy={62} r={1.4} fill="#26243B" />
        <path d="M 66 68 l -2 6 M 74 68 l 2 6" stroke="#E8B06B" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    </g>
  ),

  // ── Azure Bay ──
  marina: (uid, d) => (
    <g>
      {AzureGround(d)}
      <Water y={64} />
      <path d="M 30 64 L 34 50 L 52 50 L 56 64 Z" fill="#F4EFE6" />
      <path d="M 56 64 l 10 -8 l 0 8 z" fill="#E4572E" />
      <rect x={41} y={38} width={4} height={12} fill="#B8B0C4" />
      <Window x={37} y={54} w={5} h={6} />
      <Tower uid={uid} x={64} y={40} w={18} h={24} base="#BFE4F5" roofColor="#4FA8D8" windows={1} />
      <path d="M 12 72 q 6 -4 12 0 q 6 4 12 0 q 6 -4 12 0 q 6 4 12 0 q 6 -4 12 0 q 6 4 12 0" stroke="#E4F4FC" strokeWidth={1.8} fill="none" opacity={0.7} />
    </g>
  ),
  lighthouse: (uid, d) => (
    <g>
      {AzureGround(d)}
      <Water y={70} />
      <path d="M 40 70 L 44 26 L 56 26 L 60 70 Z" fill="#F4EFE6" />
      <path d="M 40 70 L 44 26 L 50 26 L 50 70 Z" fill="#E4572E" opacity={0.25} />
      {[38, 50, 62].map((y) => <rect key={y} x={42.5} y={y} width={15} height={5} fill="#E4572E" />)}
      <rect x={43} y={16} width={14} height={11} rx={2} fill="#4A5A6A" />
      <rect x={45} y={18} width={10} height={7} fill="#FFE08A" />
      <path d="M 42 16 L 50 8 L 58 16 Z" fill="#E4572E" />
      <g className="ec-anim-beacon" aria-hidden="true">
        <path d="M 55 21 L 78 10 L 78 32 Z" fill="#FFE08A" opacity={0.45} />
      </g>
      <Rock uid={uid} />
    </g>
  ),
  boardwalk: (uid, d) => (
    <g>
      {AzureGround(d)}
      <Water y={74} />
      <path d="M 8 74 h 84" stroke="#C4A86A" strokeWidth={10} strokeLinecap="round" />
      {[14, 28, 42, 56, 70, 84].map((x) => <path key={x} d={`M ${x} 70 v 8`} stroke="#A88A4A" strokeWidth={1.6} />)}
      <House uid={uid} x={14} y={36} w={22} h={26} base="#FFE8C4" roof="#4FA8D8" />
      <House uid={`${uid}b`} x={44} y={30} w={24} h={32} base="#FFD9A8" roof="#E08A2E" />
      <path d="M 44 30 q 12 -8 24 0" fill="none" stroke="#E4572E" strokeWidth={2} />
      <circle cx={50} cy={26} r={3} fill="#F2B33D" />
      <path d="M 74 46 l 0 16 M 70 62 l 8 0" stroke="#8A9BA8" strokeWidth={2.4} strokeLinecap="round" />
    </g>
  ),

  // ── Old Town ──
  rosealley: (uid, d) => (
    <g>
      {OldTownGround(d)}
      <House uid={uid} x={12} y={36} w={34} h={42} base="#F2C6D8" roof="#D86FA4" />
      <House uid={`${uid}b`} x={54} y={42} w={34} h={36} base={shade('#F2C6D8', -8)} roof="#C4588A" />
      <Door x={24} y={62} w={10} h={16} fill="#7C4A66" />
      <Window x={38} y={48} w={7} h={8} />
      <Window x={60} y={52} w={7} h={8} />
      <g aria-hidden="true">
        {[20, 30, 62, 72].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 78 : 74})`}>
            <circle r={3.4} fill="#E4572E" />
            <circle r={1.6} fill="#FFD98E" />
            <path d="M 0 3 v 4" stroke="#4A9E5C" strokeWidth={1.4} />
          </g>
        ))}
      </g>
    </g>
  ),
  clocktower: (uid, d) => (
    <g>
      {OldTownGround(d)}
      <rect x={36} y={30} width={28} height={48} rx={3} fill="#F2C6D8" />
      <path d="M 32 32 L 50 12 L 68 32 Z" fill="#7C4A66" />
      <circle cx={50} cy={44} r={10} fill="#FFF7E0" stroke="#7C4A66" strokeWidth={2} />
      <path d="M 50 44 L 50 38 M 50 44 L 54.5 46" stroke="#26243B" strokeWidth={1.8} strokeLinecap="round" className="ec-anim-clockhand" />
      <Window x={42} y={60} w={6} h={8} />
      <Window x={53} y={60} w={6} h={8} />
      <Door x={44} y={68} w={12} h={10} fill="#7C4A66" />
      <House uid={`${uid}s`} x={8} y={48} w={20} h={30} base={shade('#F2C6D8', -6)} roof="#D86FA4" />
      <House uid={`${uid}t`} x={72} y={48} w={20} h={30} base={shade('#F2C6D8', -6)} roof="#D86FA4" />
    </g>
  ),
  opera: (uid, d) => (
    <g>
      {OldTownGround(d)}
      <rect x={14} y={42} width={72} height={36} rx={3} fill="#F2C6D8" />
      <path d="M 14 44 a 36 20 0 0 1 72 0 z" fill="#D86FA4" />
      {[26, 38, 50, 62, 74].map((x) => (
        <g key={x}>
          <rect x={x - 1.6} y={48} width={3.2} height={30} fill="#FFF3D6" />
        </g>
      ))}
      <rect x={10} y={48} width={80} height={4} fill="#C4588A" />
      <circle cx={50} cy={30} r={6.5} fill="#F2B33D" />
      <path d="M 47 30 q 3 -4 6 0" stroke="#7C3A10" strokeWidth={1.4} fill="none" />
    </g>
  ),

  // ── Craft Quarter ──
  artisan: (uid, d) => (
    <g>
      {CraftGround(d)}
      <rect x={16} y={40} width={30} height={38} rx={2} fill="#E8B06B" />
      <path d="M 12 42 L 31 28 L 50 42 Z" fill="#8A5A2E" />
      {[22, 30, 38].map((x) => <Window key={x} x={x} y={48} w={6} h={7} fill="#FFD98E" />)}
      <Door x={26} y={62} w={11} h={16} fill="#6B3A1E" />
      <rect x={54} y={34} width={7} height={44} rx={2} fill="#B87A4E" />
      <rect x={66} y={44} width={7} height={34} rx={2} fill="#A86B3E" />
      <g className="ec-anim-smoke" fill="#D8D3C8" opacity={0.7}>
        <circle cx={57.5} cy={28} r={4} />
        <circle cx={60} cy={20} r={5.4} />
      </g>
      <Wheel uid={uid} />
    </g>
  ),
  market: (uid, d) => (
    <g>
      {CraftGround(d)}
      <path d="M 12 40 q 38 -14 76 0 l 0 5 q -38 -12 -76 0 z" fill="#E08A2E" />
      <path d="M 16 44 v 34 M 50 40 v 38 M 84 44 v 34" stroke="#8A5A2E" strokeWidth={3} />
      <path d="M 12 40 q 38 -14 76 0 l 0 3 q -38 -12 -76 0 z" fill={shade('#E08A2E', -12)} />
      {[22, 34, 46, 58, 70].map((x, i) => (
        <g key={x}>
          <rect x={x} y={62} width={9} height={12} rx={1.5} fill={['#E4572E', '#4A9E5C', '#F2B33D', '#D86FA4', '#4FA8D8'][i]} />
          <path d={`M ${x} 62 h 9`} stroke="#FFF3D6" strokeWidth={1.6} />
        </g>
      ))}
      <rect x={12} y={74} width={76} height={4} fill="#C4A86A" />
    </g>
  ),
  glassworks: (uid, d) => (
    <g>
      {CraftGround(d)}
      <rect x={24} y={28} width={52} height={50} rx={3} fill="#D8E8F0" opacity={0.85} />
      <rect x={24} y={28} width={52} height={50} rx={3} fill="none" stroke="#8A9BA8" strokeWidth={2} />
      {[34, 44, 54, 64, 74].map((x) => <path key={x} d={`M ${x} 28 v 50`} stroke="#A8BCC8" strokeWidth={1.4} />)}
      {[38, 48, 58, 68].map((y) => <path key={y} d={`M 24 ${y} h 52`} stroke="#A8BCC8" strokeWidth={1.4} />)}
      <path d="M 24 28 L 50 14 L 76 28 Z" fill="#8A9BA8" />
      <Specular x={38} y={38} w={14} h={8} rot={-30} opacity={0.5} />
      <Door x={44} y={66} w={12} h={12} fill="#5E7080" />
    </g>
  ),

  // ── Crimson Quarter ──
  crimsongate: (uid, d) => (
    <g>
      {CrimsonGround(d)}
      <rect x={16} y={30} width={14} height={48} rx={4} fill="#C43B4A" />
      <rect x={70} y={30} width={14} height={48} rx={4} fill="#C43B4A" />
      <path d="M 12 32 Q 50 12 88 32 L 88 40 Q 50 22 12 40 Z" fill="#E86A6A" />
      {[30, 42, 58, 70].map((x, i) => (
        <g key={x} className={i % 2 ? 'ec-anim-lantern' : undefined}>
          <path d={`M ${x} 40 v 8`} stroke="#FFD98E" strokeWidth={1.4} />
          <ellipse cx={x} cy={52} rx={3.4} ry={4.4} fill="#FFD98E" />
          <path d={`M ${x - 2} 56 h 4`} stroke="#C43B4A" strokeWidth={1.2} />
        </g>
      ))}
      <Door x={44} y={56} w={12} h={22} fill="#7C1F2E" />
    </g>
  ),
  ember: (uid, d) => (
    <g>
      {CrimsonGround(d)}
      <rect x={20} y={38} width={60} height={40} rx={3} fill="#E86A6A" />
      <path d="M 16 40 L 50 22 L 84 40 Z" fill="#9E2B36" />
      {[28, 40, 52, 64].map((x) => <Window key={x} x={x} y={48} w={7} h={8} fill="#FFD98E" />)}
      <Door x={45} y={62} w={10} h={16} fill="#7C1F2E" />
      <g className="ec-anim-flicker" fill="#FFB84A">
        <path d="M 84 30 q 3 -6 2 -10 q 5 5 3 12 q -2 4 -5 2" />
      </g>
      <path d="M 30 22 l 1.2 3 3 .4 -2.2 2 .6 3 -2.6 -1.5 -2.6 1.5 .6 -3 -2.2 -2 3 -.4 z" fill="#FFD98E" />
    </g>
  ),
  dragonbridge: (uid, d) => (
    <g>
      {CrimsonGround(d)}
      <Water y={64} fill="#8A4A5A" height={14} />
      <path d="M 6 58 Q 50 34 94 58" stroke="#C43B4A" strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M 6 58 Q 50 34 94 58" stroke="#E86A6A" strokeWidth={3} fill="none" strokeLinecap="round" />
      {[24, 40, 60, 76].map((x) => {
        const y = 58 - Math.sin(((x - 6) / 88) * Math.PI) * 20;
        return <path key={x} d={`M ${x} ${y} v 14`} stroke="#9E2B36" strokeWidth={2.2} />;
      })}
      <path d="M 6 54 q -4 -8 2 -12 M 94 54 q 4 -8 -2 -12" stroke="#C43B4A" strokeWidth={5} fill="none" strokeLinecap="round" />
      <g aria-hidden="true">
        <circle cx={8} cy={38} r={5} fill="#E86A6A" />
        <path d="M 4 36 l -3 -2 M 4 40 l -3 2" stroke="#F2B33D" strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={7} cy={37} r={1} fill="#26243B" />
      </g>
    </g>
  ),

  // ── Sunset Palms ──
  palms: (uid, d) => (
    <g>
      {PalmsGround(d)}
      <rect x={26} y={40} width={48} height={38} rx={3} fill="#F5DFA0" />
      <path d="M 22 42 L 50 24 L 78 42 Z" fill="#E8B84A" />
      <Window x={34} y={48} w={8} h={9} />
      <Window x={58} y={48} w={8} h={9} />
      <Door x={44} y={62} w={12} h={16} fill="#C08A1E" />
      <Palm x={12} y={72} />
      <Palm x={88} y={74} flip />
    </g>
  ),
  dunes: (uid, d) => (
    <g>
      {PalmsGround(d)}
      <path d="M 0 74 Q 25 52 50 72 Q 75 88 100 66 L 100 100 L 0 100 Z" fill="#E8C87A" />
      <path d="M 0 84 Q 30 68 60 82 Q 85 92 100 80 L 100 100 L 0 100 Z" fill="#D8B05A" />
      <path d="M 30 60 q 6 -3 12 0" stroke="#C4A040" strokeWidth={1.4} fill="none" />
      <Palm x={78} y={58} />
      <circle cx={22} cy={34} r={11} fill="#FFE08A" opacity={0.8} />
      <circle cx={22} cy={34} r={7} fill="#FFF3C4" />
    </g>
  ),
  solaris: (uid, d) => (
    <g>
      {PalmsGround(d)}
      <defs><Grad id={`${uid}-s`} from="#FFE08A" to="#E8A81E" /></defs>
      <rect x={34} y={20} width={32} height={58} rx={4} fill={`url(#${uid}-s)`} />
      {[30, 40, 50, 60, 70].map((y) => <rect key={y} x={38} y={y} width={7} height={5} rx={1} fill="#FFF3C4" />)}
      {[30, 40, 50, 60, 70].map((y) => <rect key={`b${y}`} x={53} y={y} width={7} height={5} rx={1} fill="#FFF3C4" />)}
      <circle cx={50} cy={16} r={7} fill="#FFF6DC" />
      <g className="ec-anim-sparkle" fill="#FFF6DC">
        <path d="M 70 24 l 1.2 3 3 .4 -2.2 2 .6 3 -2.6 -1.5 -2.6 1.5 .6 -3 -2.2 -2 3 -.4 z" />
      </g>
      <Specular x={42} y={30} w={8} h={16} rot={0} opacity={0.4} />
    </g>
  ),

  // ── Verdant Heights ──
  dome: (uid, d) => (
    <g>
      {VerdantGround(d)}
      <defs>
        <linearGradient id={`${uid}-d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8F4E0" />
          <stop offset="1" stopColor="#7FC8A0" />
        </linearGradient>
      </defs>
      <path d="M 20 78 a 30 32 0 0 1 60 0 z" fill={`url(#${uid}-d)`} opacity={0.9} />
      <path d="M 20 78 a 30 32 0 0 1 60 0" fill="none" stroke="#4A9E5C" strokeWidth={2.4} />
      {[30, 40, 50, 60, 70].map((x) => <path key={x} d={`M ${x} ${78 - Math.sqrt(Math.max(0, 1 - ((x - 50) / 30) ** 2)) * 32} L ${x} 78`} stroke="#A8D8A0" strokeWidth={1.2} opacity={0.8} />)}
      <rect x={14} y={76} width={72} height={5} rx={2} fill="#C8CDD6" />
      <Tree x={36} y={74} s={0.8} />
      <Tree x={64} y={75} s={0.7} />
      <Specular x={38} y={40} w={14} h={7} rot={-20} opacity={0.5} />
    </g>
  ),
  bridge: (uid, d) => (
    <g>
      {VerdantGround(d)}
      <Water y={68} />
      <path d="M 8 62 Q 50 40 92 62" stroke="#C4A86A" strokeWidth={6} fill="none" />
      <path d="M 8 62 Q 50 40 92 62" stroke="#8A6B4A" strokeWidth={2} fill="none" />
      {[26, 50, 74].map((x) => {
        const y = 62 - Math.sin(((x - 8) / 84) * Math.PI) * 16;
        return (
          <g key={x}>
            <path d={`M ${x} ${y - 12} L ${x} ${y + 8}`} stroke="#8A6B4A" strokeWidth={2.6} />
            <path d={`M ${x - 4} ${y - 10} L ${x + 4} ${y - 10}`} stroke="#8A6B4A" strokeWidth={2} />
          </g>
        );
      })}
      <Tree x={12} y={78} s={1} />
      <Tree x={88} y={78} s={1.1} />
    </g>
  ),
  temple: (uid, d) => (
    <g>
      {VerdantGround(d)}
      <path d="M 24 78 L 24 44 Q 50 8 76 44 L 76 78 Z" fill="#C8B88A" />
      <path d="M 24 78 L 24 44 Q 50 8 76 44 L 76 78 Z" fill="none" stroke="#A89868" strokeWidth={2} />
      <path d="M 38 78 L 38 56 Q 50 42 62 56 L 62 78 Z" fill="#7C6A48" />
      <path d="M 50 14 L 54 24 L 46 24 Z" fill="#F2B33D" />
      <path d="M 30 50 q 8 -12 20 -14" stroke="#E8D8A8" strokeWidth={2} fill="none" opacity={0.7} />
      <Tree x={14} y={78} s={0.9} />
      <Tree x={87} y={79} s={0.8} />
      <Specular x={40} y={34} w={10} h={6} rot={-24} opacity={0.35} />
    </g>
  ),

  // ── Imperial Heights ──
  observatory: (uid, d) => (
    <g>
      {ImperialGround(d)}
      <rect x={28} y={48} width={44} height={30} rx={3} fill="#8C9AE8" />
      <path d="M 26 50 a 24 18 0 0 1 48 0 z" fill="#6B7AC4" />
      <path d="M 38 44 a 12 10 0 0 1 24 0" fill="#4A5A9A" />
      <g transform="rotate(-32 50 42)">
        <rect x={47} y={26} width={6} height={22} rx={3} fill="#E8ECFF" />
      </g>
      <circle cx={76} cy={22} r={6} fill="#FFF6DC" />
      <circle cx={84} cy={14} r={3} fill="#FFF6DC" opacity={0.7} />
      <g fill="#FFF" opacity={0.8}>
        <circle cx={20} cy={18} r={1.4} />
        <circle cx={30} cy={10} r={1} />
        <circle cx={88} cy={30} r={1.2} />
      </g>
      <Door x={46} y={62} w={10} h={16} fill="#3D4A80" />
    </g>
  ),
  palace: (uid, d) => (
    <g>
      {ImperialGround(d)}
      <defs><Grad id={`${uid}-pal`} from="#A8B4F0" to="#6B7AC4" /></defs>
      <rect x={20} y={44} width={60} height={34} rx={3} fill={`url(#${uid}-pal)`} />
      <Tower uid={`${uid}t1`} x={12} y={34} w={14} h={44} base="#8C9AE8" domeColor="#4A5FC4" windows={2} />
      <Tower uid={`${uid}t2`} x={74} y={34} w={14} h={44} base="#8C9AE8" domeColor="#4A5FC4" windows={2} />
      <path d="M 18 46 Q 50 22 82 46 L 82 50 Q 50 30 18 50 Z" fill="#4A5FC4" />
      <path d="M 50 22 l 0 -10 M 50 12 l 8 3 l -8 3" stroke="#F2B33D" strokeWidth={2} fill="none" strokeLinecap="round" />
      {[30, 42, 58, 70].map((x) => <Window key={x} x={x} y={52} w={7} h={9} fill="#E8ECFF" />)}
      <Door x={44} y={62} w={12} h={16} fill="#3D4A80" />
      <Specular x={30} y={50} w={10} h={5} opacity={0.3} />
    </g>
  ),

  // ── Stations ──
  train: (uid) => (
    <g>
      <Ground fill="#9CB48A" />
      <rect x={8} y={72} width={84} height={6} rx={2} fill="#6B6280" />
      {[16, 34, 52, 70, 88].map((x) => <path key={x} d={`M ${x} 70 v 10`} stroke="#4C4460" strokeWidth={2.4} />)}
      <rect x={12} y={36} width={56} height={34} rx={7} fill="#2E86AB" />
      <path d="M 12 44 q 28 -8 56 0" stroke="#1D5F7E" strokeWidth={3} fill="none" />
      <rect x={68} y={44} width={18} height={26} rx={4} fill="#1D5F7E" />
      <rect x={74} y={30} width={7} height={15} rx={2} fill="#5E6A78" />
      <g className="ec-anim-smoke" fill="#E8E4DC" opacity={0.8}>
        <circle cx={77} cy={26} r={4} />
        <circle cx={80} cy={18} r={5.5} />
      </g>
      <Window x={20} y={44} w={9} h={10} />
      <Window x={34} y={44} w={9} h={10} />
      <Window x={48} y={44} w={9} h={10} />
      <circle cx={26} cy={72} r={5.5} fill="#3D3448" />
      <circle cx={26} cy={72} r={2} fill="#8A8FA8" />
      <circle cx={56} cy={72} r={5.5} fill="#3D3448" />
      <circle cx={56} cy={72} r={2} fill="#8A8FA8" />
      <rect x={12} y={62} width={56} height={4} rx={2} fill="#E4572E" />
    </g>
  ),
  metro: (uid) => (
    <g>
      <Ground fill="#B0A8C0" />
      <rect x={6} y={30} width={88} height={8} rx={3} fill="#8A8FA8" />
      <rect x={10} y={38} width={6} height={40} fill="#8A8FA8" />
      <rect x={84} y={38} width={6} height={40} fill="#8A8FA8" />
      <rect x={16} y={44} width={68} height={26} rx={8} fill="#E4572E" />
      <rect x={16} y={50} width={68} height={6} fill="#B23A18" />
      <Window x={22} y={48} w={10} h={12} fill="#DDEFFF" />
      <Window x={38} y={48} w={10} h={12} fill="#DDEFFF" />
      <Window x={54} y={48} w={10} h={12} fill="#DDEFFF" />
      <rect x={70} y={48} width={10} height={12} rx={2} fill="#26243B" opacity={0.8} />
      <circle cx={28} cy={72} r={5} fill="#3D3448" />
      <circle cx={70} cy={72} r={5} fill="#3D3448" />
      <path d="M 6 84 h 88" stroke="#6B6280" strokeWidth={3} />
    </g>
  ),
  ferry: (uid) => (
    <g>
      <Water y={62} />
      <path d="M 18 62 L 26 46 L 66 46 L 74 62 Z" fill="#2C6E63" />
      <rect x={30} y={30} width={30} height={16} rx={3} fill="#F4EFE6" />
      <rect x={38} y={20} width={8} height={10} fill="#E4572E" />
      <Window x={34} y={34} w={7} h={8} />
      <Window x={45} y={34} w={7} h={8} />
      <path d="M 26 46 h 40" stroke="#1D4E46" strokeWidth={2} />
      <path d="M 12 70 q 6 -3 12 0 q 6 3 12 0 q 6 -3 12 0 q 6 3 12 0 q 6 -3 12 0 q 6 3 12 0" stroke="#E4F4FC" strokeWidth={1.8} fill="none" opacity={0.7} />
      <path d="M 82 54 l 8 0 l -3 6" fill="#E4572E" />
      <circle cx={50} cy={70} r={3} fill="#E4F4FC" opacity={0.6} className="ec-anim-bob" />
    </g>
  ),
  cablecar: (uid) => (
    <g>
      <path d="M 0 30 L 100 18" stroke="#6B6280" strokeWidth={2.4} />
      <path d="M 0 34 L 100 22" stroke="#6B6280" strokeWidth={2.4} />
      <rect x={8} y={70} width={14} height={10} rx={2} fill="#8A9BA8" />
      <rect x={78} y={64} width={14} height={10} rx={2} fill="#8A9BA8" />
      <g className="ec-anim-bob">
        <path d="M 44 22 l 8 0" stroke="#3D3448" strokeWidth={2} />
        <rect x={36} y={24} width={24} height={20} rx={5} fill="#E08A2E" />
        <Window x={40} y={28} w={7} h={9} fill="#FFF3D6" />
        <Window x={50} y={28} w={7} h={9} fill="#FFF3D6" />
      </g>
      <Ground fill="#7FA86B" />
      <Tree x={16} y={70} s={0.9} />
      <Tree x={86} y={64} s={0.8} />
    </g>
  ),

  // ── Utilities ──
  powerplant: (uid) => (
    <g>
      <Ground fill="#B0A8A0" />
      <path d="M 24 78 L 30 30 Q 36 22 42 30 L 48 78 Z" fill="#D8D3C8" />
      <path d="M 54 78 L 58 42 Q 62 36 66 42 L 70 78 Z" fill="#C8C3B8" />
      <path d="M 30 30 Q 36 22 42 30 L 41 36 Q 36 30 31 36 Z" fill="#E4572E" opacity={0.7} />
      <g className="ec-anim-smoke" fill="#E8E4DC" opacity={0.75}>
        <circle cx={36} cy={22} r={4.5} />
        <circle cx={40} cy={13} r={6} />
      </g>
      <path d="M 76 44 l 8 0 l -5 10 l 7 0 l -12 18 l 3 -13 l -7 0 z" fill="#F2B33D" stroke="#C08A1E" strokeWidth={1} />
      <rect x={12} y={74} width={76} height={5} rx={2} fill="#8A8FA8" />
    </g>
  ),
  watertower: (uid) => (
    <g>
      <Ground fill="#8FBF7A" />
      <path d="M 30 34 L 70 34 L 66 62 L 34 62 Z" fill="#5A9AC4" />
      <path d="M 30 34 L 70 34 L 68.5 48 L 31.5 48 Z" fill="#7FC4E8" opacity={0.6} />
      <path d="M 26 34 L 74 34 L 68 22 L 32 22 Z" fill="#4A8CB4" />
      <path d="M 50 22 L 50 10" stroke="#4A8CB4" strokeWidth={2.4} />
      <path d="M 36 62 L 32 78 M 64 62 L 68 78 M 42 62 L 40 78 M 58 62 L 60 78" stroke="#8A6B4A" strokeWidth={2.6} />
      <path d="M 34 70 L 66 70" stroke="#8A6B4A" strokeWidth={2} />
      <path d="M 76 48 q 4 6 0 9 q -4 -3 0 -9" fill="#7FC4E8" />
      <Specular x={40} y={30} w={9} h={5} opacity={0.4} />
    </g>
  ),
};

// helpers used inside scenes
const NIGHT_SKIES = new Set(['observatory', 'palace']);
const WARM_SKIES = new Set(['palms', 'dunes', 'solaris', 'crimsongate', 'ember', 'dragonbridge']);

export function Landmark({ artKey, district, theme = 'classic', size = '100%', className, label }: {
  artKey: string; district?: DistrictId; theme?: string; size?: number | string; className?: string; label?: string;
}): ReactNode {
  void theme; // theme affects tile frame colors, not the scene
  const scene = SCENES[artKey] ?? SCENES.chest;
  const uid = `lm-${artKey}`;
  const night = NIGHT_SKIES.has(artKey);
  const warm = WARM_SKIES.has(artKey);
  const skyFrom = night ? '#2E2A4E' : warm ? '#FFE0B0' : '#D8F0FC';
  const skyTo = night ? '#4A5A8A' : warm ? '#FFD090' : '#A8DCF4';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={label ?? `Illustration: ${artKey}`}>
      <defs>
        <Grad id={`${uid}-sky`} from={skyFrom} to={skyTo} />
      </defs>
      <rect x="0" y="0" width="100" height="100" rx={7} fill={`url(#${uid}-sky)`} aria-hidden="true" />
      {night && (
        <g aria-hidden="true" fill="#FFF6DC">
          <circle cx={16} cy={14} r={1.2} />
          <circle cx={30} cy={8} r={0.9} />
          <circle cx={70} cy={10} r={1.1} />
          <circle cx={86} cy={20} r={0.9} />
          <circle cx={52} cy={7} r={0.8} />
        </g>
      )}
      {scene(uid, district)}
      {district && <Banner banner={DISTRICTS[district].banner} pattern={DISTRICTS[district].pattern} />}
    </svg>
  );
}

function HarborGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#C4A86A" />; }
function AzureGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#E8D5B5" />; }
function OldTownGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#C8B8A8" />; }
function CraftGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#C4A07A" />; }
function CrimsonGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#B87A6A" />; }
function PalmsGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#F0DCA8" />; }
function VerdantGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#9CC88A" />; }
function ImperialGround(d?: DistrictId): ReactNode { void d; return <rect x={0} y={78} width={100} height={22} fill="#A8B0D0" />; }

function Rock({ uid }: { uid: string }): ReactNode {
  void uid;
  return (
    <g aria-hidden="true">
      <ellipse cx={50} cy={74} rx={26} ry={8} fill="#6E7A87" />
      <ellipse cx={50} cy={72} rx={26} ry={7} fill="#8A9BA8" />
    </g>
  );
}

function Wheel({ uid }: { uid: string }): ReactNode {
  void uid;
  return (
    <g aria-hidden="true" transform="translate(74 58)">
      <circle r={11} fill="none" stroke="#6B3A1E" strokeWidth={3} />
      <circle r={11} fill="none" stroke="#A87848" strokeWidth={1.4} />
      <path d="M -11 0 h 22 M 0 -11 v 22 M -8 -8 l 16 16 M -8 8 l 16 -16" stroke="#6B3A1E" strokeWidth={1.6} />
    </g>
  );
}

function Palm({ x, y, flip = false }: { x: number; y: number; flip?: boolean }): ReactNode {
  return (
    <g aria-hidden="true" transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path d="M 0 0 q 2 -10 1 -20" stroke="#8A6B4A" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <g fill="#4A9E5C">
        <path d="M 1 -20 q -12 -6 -16 2 q 10 -2 14 4" />
        <path d="M 1 -20 q 12 -6 16 2 q -10 -2 -14 4" />
        <path d="M 1 -20 q -8 -10 -14 -8 q 8 0 12 10" />
        <path d="M 1 -20 q 8 -10 14 -8 q -8 0 -12 10" />
        <path d="M 1 -21 q -2 -9 4 -13 q -1 7 -1 13" />
      </g>
      <circle cx={2} cy={-16} r={2.2} fill="#8A5A2E" />
    </g>
  );
}

export const LANDMARK_KEYS = Object.keys(SCENES);
