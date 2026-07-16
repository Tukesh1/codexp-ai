"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { api, setToken, type User } from "@/lib/api"

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, name?: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api.me()
      setUser(me)
    } catch {
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("codeexp_token") : null
    if (!token) {
      setLoading(false)
      return
    }
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, name?: string) => {
    const res = await api.devLogin(email, name)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
