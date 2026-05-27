"use client"

import * as React from "react"

export const ATMOSPHERE_VALUES = [
  "industrial",
  "tecnologica",
  "comercial",
] as const

export type AtmosphereValue = (typeof ATMOSPHERE_VALUES)[number]

const STORAGE_KEY = "inventori.atmosphere"
const DEFAULT_ATMOSPHERE: AtmosphereValue = "industrial"

function isValidAtmosphere(value: string | null): value is AtmosphereValue {
  return (
    value !== null &&
    (ATMOSPHERE_VALUES as readonly string[]).includes(value)
  )
}

function readStoredAtmosphere(): AtmosphereValue {
  if (typeof window === "undefined") return DEFAULT_ATMOSPHERE
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isValidAtmosphere(stored) ? stored : DEFAULT_ATMOSPHERE
  } catch {
    return DEFAULT_ATMOSPHERE
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

function applyAtmosphereToDom(atmosphere: AtmosphereValue, instant = false) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const cleanup = instant ? disableTransitionsOneFrame() : () => {}
  root.setAttribute("data-atmosphere", atmosphere)
  cleanup()
}

interface AtmosphereContextType {
  atmosphere: AtmosphereValue
  setAtmosphere: (value: AtmosphereValue) => void
}

const AtmosphereContext = React.createContext<AtmosphereContextType | undefined>(undefined)

export function AtmosphereProvider({ children }: { children: React.ReactNode }) {
  const [atmosphere, setAtmosphereState] = React.useState<AtmosphereValue>(DEFAULT_ATMOSPHERE)

  React.useEffect(() => {
    const initial = readStoredAtmosphere()
    setAtmosphereState(initial)
    applyAtmosphereToDom(initial)

    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = isValidAtmosphere(event.newValue) ? event.newValue : DEFAULT_ATMOSPHERE
      setAtmosphereState(next)
      applyAtmosphereToDom(next, true)
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const setAtmosphere = React.useCallback((value: AtmosphereValue) => {
    setAtmosphereState(value)
    applyAtmosphereToDom(value, true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, value)
      }
    } catch {
      // ignore storage limits/exceptions
    }
  }, [])

  const value = React.useMemo(() => ({ atmosphere, setAtmosphere }), [atmosphere, setAtmosphere])

  return (
    <AtmosphereContext.Provider value={value}>
      {children}
    </AtmosphereContext.Provider>
  )
}

export function useAtmosphere() {
  const context = React.useContext(AtmosphereContext)
  if (!context) {
    throw new Error("useAtmosphere must be used within an AtmosphereProvider")
  }
  return context
}

export function AtmosphereScript() {
  const code = `(function(){try{var v=localStorage.getItem("${STORAGE_KEY}")||"${DEFAULT_ATMOSPHERE}";document.documentElement.setAttribute("data-atmosphere",v)}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />
}
