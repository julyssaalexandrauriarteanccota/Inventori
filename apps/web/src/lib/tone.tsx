"use client"

import * as React from "react"

/**
 * Tone tier sits ABOVE the accent system.
 * - "muted":  paleta opaca actual (neutros sin tinte).
 * - "warm":   paleta calida estilo POS (neutros tintados + acento mas saturado).
 *
 * Cambia el atributo `data-tone` en <html>. globals.css define overrides
 * para [data-tone="warm"] que reescriben los color-mix con bases calidas.
 */
export const TONE_VALUES = ["muted", "warm"] as const

export type ToneValue = (typeof TONE_VALUES)[number]

const STORAGE_KEY = "inventori.tone"
const DEFAULT_TONE: ToneValue = "muted"

function isValidTone(value: string | null): value is ToneValue {
  return (
    value !== null && (TONE_VALUES as readonly string[]).includes(value)
  )
}

function readStoredTone(): ToneValue {
  if (typeof window === "undefined") return DEFAULT_TONE
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isValidTone(stored) ? stored : DEFAULT_TONE
  } catch {
    return DEFAULT_TONE
  }
}

function disableTransitionsOneFrame() {
  if (typeof document === "undefined") return () => {}
  const css = document.createElement("style")
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation-duration:0s!important}",
    ),
  )
  document.head.appendChild(css)
  void window.getComputedStyle(document.body).opacity
  return () => {
    requestAnimationFrame(() => {
      void window.getComputedStyle(document.body).opacity
      css.remove()
    })
  }
}

function applyToneToDom(tone: ToneValue, instant = false) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const cleanup = instant ? disableTransitionsOneFrame() : () => {}
  if (tone === DEFAULT_TONE) {
    root.removeAttribute("data-tone")
  } else {
    root.setAttribute("data-tone", tone)
  }
  cleanup()
}

export function useTone(): {
  tone: ToneValue
  setTone: (value: ToneValue) => void
} {
  const [tone, setToneState] = React.useState<ToneValue>(DEFAULT_TONE)

  React.useEffect(() => {
    const initial = readStoredTone()
    setToneState(initial)
    applyToneToDom(initial)

    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = isValidTone(event.newValue) ? event.newValue : DEFAULT_TONE
      setToneState(next)
      applyToneToDom(next, true)
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const setTone = React.useCallback((value: ToneValue) => {
    setToneState(value)
    applyToneToDom(value, true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, value)
      }
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [])

  return { tone, setTone }
}

/**
 * Inline script that runs before React hydration to apply the persisted tone
 * and avoid a flash of wrong palette. Mount once in the root layout `<head>`,
 * preferably right after AccentScript.
 */
export function ToneScript() {
  const allowed = JSON.stringify(
    TONE_VALUES.filter((v) => v !== DEFAULT_TONE),
  )
  const code = `(function(){try{var v=localStorage.getItem("${STORAGE_KEY}");if(${allowed}.indexOf(v)>=0){document.documentElement.setAttribute("data-tone",v)}}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
