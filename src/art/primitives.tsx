/**
 * Shared SVG illustration primitives — Empire City art system.
 * Style: soft-3D stylized vector, light from top-left, gradients + soft
 * ground shadows, rounded forms. All decorative internals aria-hidden;
 * meaningful roots carry role/aria-label.
 */
import type { ReactNode } from 'react';

// ─── Gradient helpers ───────────────────────────────────────────────────────

export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + Math.round(2.55 * pct)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + Math.round(2.55 * pct)));
  const b = Math.min(255, Math.max(0, (n & 255) + Math.round(2.55 * pct)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export interface GradDef {
  id: string;
  from: string;
  to: string;
  vertical?: boolean;
}

export function Grad({ id, from, to, vertical = true }: GradDef): ReactNode {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

export function ShadowEllipse({ cx, cy, rx, ry, opacity = 0.16 }: { cx: number; cy: number; rx: number; ry: number; opacity?: number }): ReactNode {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#141428" opacity={opacity} />;
}

/** Glossy specular highlight blob for upper-left thirds. */
export function Specular({ x, y, w, h, rot = -20, opacity = 0.35 }: { x: number; y: number; w: number; h: number; rot?: number; opacity?: number }): ReactNode {
  return (
    <ellipse
      cx={x} cy={y} rx={w / 2} ry={h / 2}
      fill="#ffffff" opacity={opacity}
      transform={`rotate(${rot} ${x} ${y})`}
    />
  );
}

// ─── Scene scaffolding ──────────────────────────────────────────────────────

export interface SceneProps {
  /** unique id prefix for gradient defs to avoid collisions */
  uid: string;
}

/** Sky backdrop with soft horizon glow. */
export function Sky({ uid, top, bottom, sun = false }: { uid: string; top: string; bottom: string; sun?: boolean }): ReactNode {
  return (
    <>
      <defs>
        <Grad id={`${uid}-sky`} from={top} to={bottom} />
      </defs>
      <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-sky)`} rx={6} />
      {sun && (
        <g aria-hidden="true">
          <circle cx="26" cy="24" r="10" fill="#FFE9A8" opacity="0.55" />
          <circle cx="26" cy="24" r="6" fill="#FFF6DC" opacity="0.9" />
        </g>
      )}
    </>
  );
}

/** Rounded window with sill. */
export function Window({ x, y, w = 8, h = 9, fill = '#FFF7E0', frame }: { x: number; y: number; w?: number; h?: number; fill?: string; frame?: string }): ReactNode {
  return (
    <g aria-hidden="true">
      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={2.5} fill={frame ?? 'rgba(0,0,0,0.18)'} />
      <rect x={x} y={y} width={w} height={h} rx={2} fill={fill} />
      <rect x={x + w / 2 - 0.75} y={y} width={1.5} height={h} fill="rgba(0,0,0,0.14)" />
      <rect x={x + 1} y={y + 1} width={w / 2 - 1.5} height={h / 2 - 1.5} rx={1} fill="#ffffff" opacity="0.4" />
    </g>
  );
}

/** Arched door. */
export function Door({ x, y, w = 10, h = 16, fill = '#7C4A2E' }: { x: number; y: number; w?: number; h?: number; fill?: string }): ReactNode {
  return (
    <g aria-hidden="true">
      <path
        d={`M ${x} ${y + h} L ${x} ${y + w / 2} Q ${x + w / 2} ${y - 2} ${x + w} ${y + w / 2} L ${x + w} ${y + h} Z`}
        fill={fill}
      />
      <circle cx={x + w - 2.5} cy={y + h / 2 + 2} r={1} fill="#F2B33D" />
    </g>
  );
}

/** Tree blob with trunk. */
export function Tree({ x, y, s = 1, leaf = '#4A9E5C', trunk = '#7C4A2E' }: { x: number; y: number; s?: number; leaf?: string; trunk?: string }): ReactNode {
  return (
    <g aria-hidden="true" transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.5" y="-6" width="3" height="8" rx="1.4" fill={trunk} />
      <circle cx="0" cy="-11" r="6.5" fill={shade(leaf, 14)} />
      <circle cx="-4" cy="-8" r="4.5" fill={leaf} />
      <circle cx="4" cy="-8" r="4.5" fill={shade(leaf, -8)} />
      <circle cx="-2" cy="-13" r="2.4" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

/** Water strip with wave scallops. */
export function Water({ y, fill = '#7FC4E8', height = 14 }: { y: number; fill?: string; height?: number }): ReactNode {
  const scallops: ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    scallops.push(<circle key={i} cx={8 + i * 14} cy={y + 3} r={3.2} fill={shade(fill, 18)} opacity={0.8} />);
  }
  return (
    <g aria-hidden="true">
      <rect x="0" y={y} width="100" height={height} fill={fill} />
      {scallops}
    </g>
  );
}

/** Cobble / road strip. */
export function Road({ y, height = 10 }: { y: number; height?: number }): ReactNode {
  const dashes: ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    dashes.push(<rect key={i} x={6 + i * 20} y={y + height / 2 - 1} width={8} height={2} rx={1} fill="#FFF3D6" opacity={0.7} />);
  }
  return (
    <g aria-hidden="true">
      <rect x="0" y={y} width="100" height={height} fill="#6B6885" opacity={0.25} />
      {dashes}
    </g>
  );
}

/** District banner strip (with pattern cue for color-blind safety). */
export function Banner({ banner, pattern, y = 0, height = 12, horizontal = true }: { banner: string; pattern: string; y?: number; height?: number; horizontal?: boolean }): ReactNode {
  const marks: ReactNode[] = [];
  const step = 9;
  if (horizontal) {
    for (let i = 0; i < Math.ceil(100 / step); i++) {
      const x = 4 + i * step;
      switch (pattern) {
        case 'rope': marks.push(<path key={i} d={`M ${x} ${y + height} l 5 -${height - 2}`} stroke="#FFF3D6" strokeWidth={1.6} opacity={0.5} />); break;
        case 'wave': marks.push(<path key={i} d={`M ${x - 2} ${y + height / 2} q 2.5 -3 5 0 q 2.5 3 5 0`} stroke="#FFF3D6" strokeWidth={1.4} fill="none" opacity={0.55} />); break;
        case 'dots': marks.push(<circle key={i} cx={x + 1} cy={y + height / 2} r={1.5} fill="#FFF3D6" opacity={0.6} />); break;
        case 'brick': marks.push(<path key={i} d={`M ${x} ${y + 4} h 6 M ${x + 3} ${y + 8} h 6`} stroke="#FFF3D6" strokeWidth={1.2} opacity={0.5} />); break;
        case 'lantern': marks.push(<circle key={i} cx={x + 1} cy={y + height / 2} r={2} fill="#FFD98E" opacity={0.65} />); break;
        case 'rays': marks.push(<path key={i} d={`M ${x} ${y + height} l 3.5 -${height}`} stroke="#FFF3D6" strokeWidth={1.4} opacity={0.45} />); break;
        case 'leaf': marks.push(<path key={i} d={`M ${x} ${y + height / 2} q 3 -3.5 6 0 q -3 3.5 -6 0`} fill="#F2EFD8" opacity={0.55} />); break;
        case 'star': marks.push(<path key={i} d={`M ${x + 1.5} ${y + 2} l 0.9 2 2.1 0.3 -1.6 1.5 0.4 2.1 -1.8 -1 -1.8 1 0.4 -2.1 -1.6 -1.5 2.1 -0.3 z`} fill="#FFF3D6" opacity={0.6} />); break;
      }
    }
  }
  return (
    <g aria-hidden="true">
      <rect x="0" y={y} width="100" height={height} fill={banner} />
      {marks}
      <rect x="0" y={y + height - 1.2} width="100" height={1.2} fill="rgba(0,0,0,0.18)" />
    </g>
  );
}
