import type { CSSProperties } from "react";

export type IvIconName =
  | "printer"
  | "copier"
  | "ink"
  | "box"
  | "tag"
  | "tools"
  | "search"
  | "bell"
  | "user"
  | "cart"
  | "chart"
  | "doc"
  | "settings"
  | "plus"
  | "minus"
  | "x"
  | "check"
  | "arrow"
  | "arrow-up"
  | "arrow-dn"
  | "menu"
  | "grid"
  | "list"
  | "trash"
  | "edit"
  | "upload"
  | "image"
  | "barcode"
  | "wallet"
  | "calendar"
  | "filter"
  | "moon"
  | "sun"
  | "sparkle"
  | "play"
  | "send"
  | "store"
  | "hash"
  | "phone"
  | "mail"
  | "qr"
  | "bolt"
  | "zap"
  | "package"
  | "logo";

type IvIconProps = {
  name: IvIconName;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function IvIcon({
  name,
  size = 18,
  stroke = 1.6,
  color = "currentColor",
  className,
  style,
}: IvIconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
  };

  switch (name) {
    case "printer":
      return (
        <svg {...p}>
          <path d="M6 9V3h12v6" />
          <rect x="3" y="9" width="18" height="9" rx="2" />
          <rect x="6" y="14" width="12" height="7" rx="1" />
          <circle cx="17" cy="12" r=".7" fill={color} stroke="none" />
        </svg>
      );
    case "copier":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M7 17v4h10v-4" />
          <path d="M7 8h10M7 12h6" />
        </svg>
      );
    case "ink":
      return (
        <svg {...p}>
          <path d="M12 3l5 7a5 5 0 1 1-10 0z" />
        </svg>
      );
    case "box":
      return (
        <svg {...p}>
          <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M3 12V4h8l10 10-8 8L3 12z" />
          <circle cx="7" cy="8" r="1.3" />
        </svg>
      );
    case "tools":
      return (
        <svg {...p}>
          <path d="M14.7 6.3a4 4 0 1 1 3 6.9l-9 9-4-4 9-9a4 4 0 0 1 1-2.9z" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-5-5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "cart":
      return (
        <svg {...p}>
          <path d="M3 4h2l2.6 12a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
          <circle cx="9" cy="21" r="1.4" />
          <circle cx="18" cy="21" r="1.4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M3 3v18h18" />
          <path d="M7 14l3-3 3 3 5-7" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "minus":
      return (
        <svg {...p}>
          <path d="M5 12h14" />
        </svg>
      );
    case "x":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M5 12l4 4 10-10" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "arrow-up":
      return (
        <svg {...p}>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      );
    case "arrow-dn":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      );
    case "menu":
      return (
        <svg {...p}>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      );
    case "grid":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "list":
      return (
        <svg {...p}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "trash":
      return (
        <svg {...p}>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      );
    case "edit":
      return (
        <svg {...p}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "upload":
      return (
        <svg {...p}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      );
    case "image":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case "barcode":
      return (
        <svg {...p}>
          <path d="M4 4v16M7 4v16M10 4v10M13 4v16M16 4v10M19 4v16" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...p}>
          <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l3-4h12l3 4M16 13h2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      );
    case "filter":
      return (
        <svg {...p}>
          <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" />
        </svg>
      );
    case "moon":
      return (
        <svg {...p}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...p}>
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
          <path d="M19 14l.7 2 2 .7-2 .7L19 19.5l-.7-2-2-.7 2-.7z" />
        </svg>
      );
    case "play":
      return (
        <svg {...p}>
          <path d="M6 4l14 8-14 8z" fill={color} />
        </svg>
      );
    case "send":
      return (
        <svg {...p}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case "store":
      return (
        <svg {...p}>
          <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 14h6" />
        </svg>
      );
    case "hash":
      return (
        <svg {...p}>
          <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
        </svg>
      );
    case "phone":
      return (
        <svg {...p}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "qr":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3v3h-3zM21 14v3M14 21h3M21 21v0M17 17v4" />
        </svg>
      );
    case "bolt":
    case "zap":
      return (
        <svg {...p}>
          <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
        </svg>
      );
    case "package":
      return (
        <svg {...p}>
          <path d="M16.5 9.4 7.5 4.2" />
          <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.3 7 12 12l8.7-5M12 22V12" />
        </svg>
      );
    case "logo":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={className}
          style={style}
        >
          <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--accent)" />
          <path d="M9 11h14v6H9z" fill="white" opacity=".25" />
          <rect x="11" y="14" width="10" height="9" rx="1.5" fill="white" />
          <circle cx="20" cy="16.5" r="1" fill="var(--accent)" />
        </svg>
      );
    default:
      return null;
  }
}
