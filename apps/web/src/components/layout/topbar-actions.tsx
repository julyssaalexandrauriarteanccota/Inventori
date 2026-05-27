"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

interface TopbarActionsContextValue {
  actions: ReactNode
  setActions: (a: ReactNode) => void
}

const TopbarActionsContext = createContext<TopbarActionsContextValue>({
  actions: null,
  setActions: () => {},
})

export function TopbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null)
  return (
    <TopbarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </TopbarActionsContext.Provider>
  )
}

/**
 * Reads the current page-level actions registered via <TopbarActions>.
 * Internal use by the ErpShell topbar + mobile bottom bar slots.
 */
export function useTopbarActions(): ReactNode {
  return useContext(TopbarActionsContext).actions
}

/**
 * Push page-level primary actions into the ErpShell topbar (desktop)
 * or the mobile sticky bottom bar (sm-and-below). Use once per page;
 * the actions are cleared when the page unmounts.
 *
 * @example
 * <TopbarActions>
 *   <RealtimeStatus />
 *   <Button>+ Nuevo</Button>
 * </TopbarActions>
 */
export function TopbarActions({ children }: { children: ReactNode }) {
  const { setActions } = useContext(TopbarActionsContext)
  useEffect(() => {
    setActions(children)
    return () => setActions(null)
  }, [children, setActions])
  return null
}
