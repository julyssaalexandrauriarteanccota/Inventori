import type { CSSProperties } from "react";
import { useId } from "react";

type MeshProps = {
  className?: string;
  style?: CSSProperties;
};

export function IvMesh({ className, style }: MeshProps) {
  const uid = useId().replace(/[:]/g, "");
  const id1 = `iv-mesh-b1-${uid}`;
  const id2 = `iv-mesh-b2-${uid}`;
  return (
    <svg
      viewBox="0 0 400 400"
      style={style}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id={id1} cx="20%" cy="30%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id2} cx="80%" cy="70%" r="50%">
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity=".4" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${id1})`} />
      <rect width="400" height="400" fill={`url(#${id2})`} />
    </svg>
  );
}
