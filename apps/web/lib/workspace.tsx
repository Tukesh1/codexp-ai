"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { AskContext } from "@/lib/api"

const STORAGE_KEY = "codeexp_active_project"
const BASKET_KEY = "codeexp_explain_basket"

type WorkspaceContextValue = {
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  askOpen: boolean
  setAskOpen: (open: boolean) => void
  openAsk: (projectId?: string) => void
  explainBasket: AskContext[]
  addToExplainBasket: (item: AskContext) => void
  removeFromExplainBasket: (path: string) => void
  clearExplainBasket: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [explainBasket, setExplainBasket] = useState<AskContext[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setActiveProjectIdState(saved)
      const basket = localStorage.getItem(BASKET_KEY)
      if (basket) setExplainBasket(JSON.parse(basket))
    } catch {
      /* ignore */
    }
  }, [])

  const persistBasket = useCallback((items: AskContext[]) => {
    setExplainBasket(items)
    try {
      localStorage.setItem(BASKET_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [])

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const openAsk = useCallback(
    (projectId?: string) => {
      if (projectId) setActiveProjectId(projectId)
      setAskOpen(true)
    },
    [setActiveProjectId]
  )

  const addToExplainBasket = useCallback(
    (item: AskContext) => {
      persistBasket([
        ...explainBasket.filter((x) => x.path !== item.path || x.start_line !== item.start_line),
        item,
      ].slice(-6))
    },
    [explainBasket, persistBasket]
  )

  const removeFromExplainBasket = useCallback(
    (path: string) => {
      persistBasket(explainBasket.filter((x) => x.path !== path))
    },
    [explainBasket, persistBasket]
  )

  const clearExplainBasket = useCallback(() => {
    persistBasket([])
  }, [persistBasket])

  const value = useMemo(
    () => ({
      activeProjectId,
      setActiveProjectId,
      askOpen,
      setAskOpen,
      openAsk,
      explainBasket,
      addToExplainBasket,
      removeFromExplainBasket,
      clearExplainBasket,
    }),
    [
      activeProjectId,
      setActiveProjectId,
      askOpen,
      openAsk,
      explainBasket,
      addToExplainBasket,
      removeFromExplainBasket,
      clearExplainBasket,
    ]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
