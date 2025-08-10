'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { SupabaseClient, Session } from '@supabase/supabase-js'

const SupabaseContext = createContext<{ client: SupabaseClient; session: Session | null } | undefined>(undefined)

export function SupabaseProvider({ client, children }: { client: SupabaseClient; children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    client.auth.getSession().then(({ data: { session } }) => setSession(session))

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [client])

  return <SupabaseContext.Provider value={{ client, session }}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used within SupabaseProvider')
  return context
}
