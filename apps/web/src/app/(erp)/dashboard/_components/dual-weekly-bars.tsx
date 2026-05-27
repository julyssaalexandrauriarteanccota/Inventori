'use client'

import type { VentaSemanaItem } from '../_hooks/use-dashboard-stats'

/* ─────────────────────────── DualWeeklyBars (SVG) ───────────────────── */

export function DualWeeklyBars({ data }: { data: VentaSemanaItem[] }) {
  /* layout constants */
  const TW = 420          // total svg width
  const YAW = 34          // y-axis label area width
  const CW = TW - YAW     // chart drawing width
  const VH = 130          // chart height in SVG units
  const TOP = 14          // top padding (above tallest bar)
  const BTM = 26          // bottom padding (for day labels)
  const SVG_H = TOP + VH + BTM
  const BASE = TOP + VH   // y-coordinate of the baseline (bottom of bars)

  // Compute max value from data for dynamic scale, min floor of 100
  const maxVal = Math.max(100, ...data.map((d) => d.ventas), ...data.map((d) => d.stock))
  // Round up to a nice number for ticks
  const ceilPow = Math.pow(10, Math.floor(Math.log10(maxVal)))
  const MAX_V = Math.ceil(maxVal / ceilPow) * ceilPow || 100
  const scaleH = (v: number) => Math.max(3, (v / MAX_V) * VH)

  const BAR_W = 13
  const BAR_GAP = 4
  const GROUP_W = BAR_W * 2 + BAR_GAP   // 30
  const N = data.length
  const GROUP_SP = (CW - N * GROUP_W) / (N + 1)
  const groupX = (i: number) => YAW + GROUP_SP + i * (GROUP_W + GROUP_SP)

  // Generate 5 ticks from 0 to MAX_V
  const TICK_COUNT = 5
  const Y_TICKS = Array.from({ length: TICK_COUNT }, (_, i) =>
    Math.round((MAX_V / (TICK_COUNT - 1)) * i),
  )

  const formatTick = (v: number) => {
    if (v === 0) return '0'
    if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`
    return String(v)
  }

  return (
    <svg
      viewBox={`0 0 ${TW} ${SVG_H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="db-primary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="db-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4a3d" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1f4a3d" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Y-axis gridlines + labels */}
      {Y_TICKS.map((tick) => {
        const y = BASE - (tick / MAX_V) * VH
        return (
          <g key={tick}>
            <line
              x1={YAW} y1={y} x2={TW} y2={y}
              stroke="currentColor" strokeOpacity={tick === 0 ? 0.12 : 0.06}
              strokeWidth={tick === 0 ? 1.5 : 1}
            />
            <text
              x={YAW - 5} y={y + 4}
              textAnchor="end" fontSize={9}
              fill="currentColor" fillOpacity={0.38}
              fontFamily="var(--font-sans)"
            >
              {formatTick(tick)}
            </text>
          </g>
        )
      })}

      {/* Dual bars per day */}
      {data.map(({ dia, stock, ventas }, i) => {
        const gx = groupX(i)
        const sH = scaleH(stock)
        const vH = scaleH(ventas)
        const labelX = gx + BAR_W + BAR_GAP / 2
        return (
          <g key={`${dia}-${i}`}>
            {/* dark series (stock movements) */}
            <rect x={gx} y={BASE - sH} width={BAR_W} height={sH} rx={5} fill="url(#db-dark)" />
            {/* primary series (ventas) */}
            <rect x={gx + BAR_W + BAR_GAP} y={BASE - vH} width={BAR_W} height={vH} rx={5} fill="url(#db-primary)" />
            {/* day label */}
            <text
              x={labelX} y={BASE + 17}
              textAnchor="middle" fontSize={9}
              fill="currentColor" fillOpacity={0.42}
              fontFamily="var(--font-sans)"
            >
              {dia}
            </text>
          </g>
        )
      })}

      {/* legend */}
      <g transform={`translate(${YAW}, ${SVG_H - 8})`}>
        <rect width={8} height={8} rx={2} fill="#1f4a3d" fillOpacity={0.7} />
        <text x={11} y={7} fontSize={8} fill="currentColor" fillOpacity={0.45} fontFamily="var(--font-sans)">Mov. Stock</text>
        <rect x={72} width={8} height={8} rx={2} fill="var(--sidebar-primary)" fillOpacity={0.8} />
        <text x={83} y={7} fontSize={8} fill="currentColor" fillOpacity={0.45} fontFamily="var(--font-sans)">Ventas (S/)</text>
      </g>
    </svg>
  )
}
