import type { ReactNode } from 'react'
import {
  createContext,
  use,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { Session } from '~/api'
import { login, logout, setSessionToken } from '~/api'
import { queryClient } from '~/lib/query-client'
import { clearSession, loadSession, saveSession } from '~/lib/session-store'

// Restore the persisted session once, at module load. Setting the api token
// here (rather than in an effect) guarantees it's in place before any
// authenticated request fires from a child. The promise is consumed with
// `use()`, so the provider suspends until the session has been restored.
const sessionRestore = loadSession().then((restored) => {
  if (restored) {
    setSessionToken(restored.token)
  }
  return restored
})

interface AuthContextValue {
  session: Session | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(use(sessionRestore))

  const signIn = useCallback(async (username: string, password: string) => {
    const nextSession = await login(username, password)
    setSessionToken(nextSession.token)
    await saveSession(nextSession)
    setSession(nextSession)
    // Refetch so permission-gated data (e.g. comments) reflects the new user.
    await queryClient.invalidateQueries()
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setSessionToken(null)
    await clearSession()
    setSession(null)
    await queryClient.invalidateQueries()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut],
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
