import type { CSSProperties } from "react";

type MascotProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function IvMascot({ size = 120, className, style }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={style}
      className={className ? `${className} anim-float` : "anim-float"}
    >
      <defs>
        <radialGradient id="iv-mascot-shade" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity=".12" />
      <rect x="62" y="32" width="76" height="62" rx="6" fill="#fff" stroke="rgba(0,0,0,.08)" />
      <rect x="72" y="46" width="40" height="3" rx="1.5" fill="#e5e1d4" />
      <rect x="72" y="56" width="56" height="3" rx="1.5" fill="#e5e1d4" />
      <rect x="72" y="66" width="32" height="3" rx="1.5" fill="#e5e1d4" />
      <rect x="40" y="80" width="120" height="80" rx="22" fill="var(--accent)" />
      <rect x="40" y="80" width="120" height="80" rx="22" fill="url(#iv-mascot-shade)" />
      <rect x="56" y="116" width="88" height="20" rx="4" fill="rgba(0,0,0,.18)" />
      <g>
        <ellipse cx="82" cy="105" rx="6" ry="7" fill="#1d1b16" />
        <ellipse cx="118" cy="105" rx="6" ry="7" fill="#1d1b16" />
        <circle cx="84" cy="103" r="2" fill="#fff" />
        <circle cx="120" cy="103" r="2" fill="#fff" />
      </g>
      <ellipse cx="68" cy="118" rx="6" ry="3" fill="#fff" opacity=".35" />
      <ellipse cx="132" cy="118" rx="6" ry="3" fill="#fff" opacity=".35" />
      <rect x="56" y="158" width="20" height="10" rx="3" fill="var(--ink)" />
      <rect x="124" y="158" width="20" height="10" rx="3" fill="var(--ink)" />
    </svg>
  );
}
