"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const STORAGE_KEY = "codeexp_active_project"

type WorkspaceContextValue = {
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  askOpen: boolean
  setAskOpen: (open: boolean) => void
  openAsk: (projectId?: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null)
  const [askOpen, setAskOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setActiveProjectIdState(saved)
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

  const value = useMemo(
    () => ({
      activeProjectId,
      setActiveProjectId,
      askOpen,
      setAskOpen,
      openAsk,
    }),
    [activeProjectId, setActiveProjectId, askOpen, openAsk]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
