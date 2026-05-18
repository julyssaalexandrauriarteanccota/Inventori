import type { CSSProperties } from "react";

type SparklesProps = {
  className?: string;
  style?: CSSProperties;
};

export function IvSparkles({ className, style }: SparklesProps) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={style} className={className}>
      <g className="anim-pulse">
        <path d="M40 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--accent-2)" />
      </g>
      <g style={{ animation: "ivPulse 3s ease-in-out infinite", animationDelay: ".4s" }}>
        <path d="M65 28l1.5 4 4 1.5-4 1.5L65 39l-1.5-4-4-1.5 4-1.5z" fill="var(--accent)" />
      </g>
      <g style={{ animation: "ivPulse 2.6s ease-in-out infinite", animationDelay: ".8s" }}>
        <path d="M14 56l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--ink)" />
      </g>
    </svg>
  );
}
