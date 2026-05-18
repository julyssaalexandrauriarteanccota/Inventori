"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type NavBadgeValue = number | string

type NavBadges = Record<string, NavBadgeValue>

type NavBadgesContextValue = {
  badges: NavBadges
  setBadge: (url: string, value: NavBadgeValue | null | undefined) => void
}

const NavBadgesContext = createContext<NavBadgesContextValue | null>(null)

/**
 * Provider global de contadores para el sidebar.
 *
 * Cualquier feature puede llamar `useSetNavBadge('/ventas', count)` para
 * inyectar un contador junto al item de navegacion. Los contadores se
 * normalizan: 0, null o undefined eliminan la badge.
 */
export function NavBadgesProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadges] = useState<NavBadges>({})

  const setBadge = useCallback(
    (url: string, value: NavBadgeValue | null | undefined) => {
      setBadges((prev) => {
        const shouldRemove =
          value == null || value === "" || value === 0 || value === "0"
        if (shouldRemove) {
          if (!(url in prev)) return prev
          const next = { ...prev }
          delete next[url]
          return next
        }
        if (prev[url] === value) return prev
        return { ...prev, [url]: value }
      })
    },
    [],
  )

  const value = useMemo(() => ({ badges, setBadge }), [badges, setBadge])

  return (
    <NavBadgesContext.Provider value={value}>
      {children}
    </NavBadgesContext.Provider>
  )
}

/** Lee el mapa de badges activas. Retorna `{}` si no hay provider. */
export function useNavBadges(): NavBadges {
  return useContext(NavBadgesContext)?.badges ?? {}
}

/**
 * Hook declarativo para setear/limpiar la badge de una ruta.
 * Uso: `useSetNavBadge('/ventas', nuevasVentas)`
 * Pasa `null` o `0` para limpiar.
 */
export function useSetNavBadge(
  url: string,
  value: NavBadgeValue | null | undefined,
) {
  const ctx = useContext(NavBadgesContext)
  useEffect(() => {
    if (!ctx) return
    ctx.setBadge(url, value)
    return () => {
      ctx.setBadge(url, null)
    }
  }, [ctx, url, value])
}
