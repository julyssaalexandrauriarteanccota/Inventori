"use client"

import * as React from "react"

export const ACCENT_VALUES = [
  "default",
  "blue",
  "green",
  "violet",
  "rose",
  "slate",
] as const

export type AccentValue = (typeof ACCENT_VALUES)[number]

const STORAGE_KEY = "inventori.accent"
const DEFAULT_ACCENT: AccentValue = "default"

function isValidAccent(value: string | null): value is AccentValue {
  return (
    value !== null &&
    (ACCENT_VALUES as readonly string[]).includes(value)
  )
}

function readStoredAccent(): AccentValue {
  if (typeof window === "undefined") return DEFAULT_ACCENT
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isValidAccent(stored) ? stored : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

/**
 * Disables CSS transitions for one frame while we swap the accent attribute.
 * Without this, every element with `transition-colors` animates its bg/border/text
 * at the same time, which shows up as visible lag on slow GPUs.
 * Pattern: https://paco.me/writing/disable-theme-transitions
 */
function disableTransitionsOneFrame() {
  if (typeof document === "undefined") return () => {}
  const css = document.createElement("style")
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation-duration:0s!important}",
    ),
  )
  document.head.appendChild(css)
  // Force reflow so the rule is applied before we mutate the attribute.
  void window.getComputedStyle(document.body).opacity
  return () => {
    // Next frame: remove the override and force another reflow so subsequent
    // user-driven transitions resume normally.
    requestAnimationFrame(() => {
      void window.getComputedStyle(document.body).opacity
      css.remove()
    })
  }
}

function applyAccentToDom(accent: AccentValue, instant = false) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const cleanup = instant ? disableTransitionsOneFrame() : () => {}
  if (accent === "default") {
    root.removeAttribute("data-accent")
  } else {
    root.setAttribute("data-accent", accent)
  }
  cleanup()
}

export function useAccent(): {
  accent: AccentValue
  setAccent: (value: AccentValue) => void
} {
  const [accent, setAccentState] = React.useState<AccentValue>(DEFAULT_ACCENT)

  React.useEffect(() => {
    const initial = readStoredAccent()
    setAccentState(initial)
    applyAccentToDom(initial)

    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = isValidAccent(event.newValue) ? event.newValue : DEFAULT_ACCENT
      setAccentState(next)
      applyAccentToDom(next, true)
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const setAccent = React.useCallback((value: AccentValue) => {
    setAccentState(value)
    applyAccentToDom(value, true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, value)
      }
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [])

  return { accent, setAccent }
}

/**
 * Inline script that runs before React hydration to apply the persisted accent
 * and avoid a flash of wrong color. Mount once in the root layout `<head>`.
 */
export function AccentScript() {
  const allowed = JSON.stringify(
    ACCENT_VALUES.filter((v) => v !== DEFAULT_ACCENT),
  )
  const code = `(function(){try{var v=localStorage.getItem("${STORAGE_KEY}");if(${allowed}.indexOf(v)>=0){document.documentElement.setAttribute("data-accent",v)}}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
