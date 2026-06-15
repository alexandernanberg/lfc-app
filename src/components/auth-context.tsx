import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session } from '~/api'
import { login, logout, setSessionToken } from '~/api'
import { queryClient } from '~/lib/query-client'
import { clearSession, loadSession, saveSession } from '~/lib/session-store'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Restore a persisted session on startup.
  useEffect(() => {
    let active = true

    void loadSession().then((restored) => {
      if (!active) {
        return
      }
      if (restored) {
        setSessionToken(restored.token)
        setSession(restored)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    })

    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const nextSession = await login(username, password)
    setSessionToken(nextSession.token)
    await saveSession(nextSession)
    setSession(nextSession)
    setStatus('authenticated')
    // Refetch so permission-gated data (e.g. comments) reflects the new user.
    await queryClient.invalidateQueries()
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setSessionToken(null)
    await clearSession()
    setSession(null)
    setStatus('unauthenticated')
    await queryClient.invalidateQueries()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
