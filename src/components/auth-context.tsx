import type { ReactNode } from 'react'
import {
  createContext,
  use,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'
import type { Session } from '~/api'
import { login, logout, setSessionToken, setUnauthorizedHandler } from '~/api'
import { queryClient } from '~/lib/query-client'
import { memberQuery } from '~/lib/queries'
import { clearSession, loadSession, saveSession } from '~/lib/session-store'

///////////////////////////////////////////////////////////
// Auth store
///////////////////////////////////////////////////////////
//
// The session lives in a tiny external store (rather than component state) so
// the request layer can clear it directly on a 401 — see `setUnauthorizedHandler`
// below — without routing a callback through an effect. Components read it with
// `useSyncExternalStore`.

let currentSession: Session | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return currentSession
}

// Restore the persisted session once, at module load. Setting the api token
// here guarantees it's in place before any authenticated request fires. The
// promise is consumed with `use()`, so the provider suspends until it resolves.
const sessionRestore = loadSession().then(async (restored) => {
  if (!restored) {
    return
  }
  await setSessionToken(restored.token)
  currentSession = restored
  emit()
  // Validate the restored session against the member endpoint. A 401 trips the
  // global handler below and clears it; prefetching (rather than a direct call)
  // means the profile screen reuses the result instead of fetching twice.
  void queryClient.prefetchQuery(memberQuery(restored.token))
})

async function clearLocalSession() {
  await setSessionToken(null)
  await clearSession()
  currentSession = null
  emit()
  await queryClient.invalidateQueries()
}

// A 401 from any endpoint means the session is no longer valid — drop it. The
// guard avoids redundant work when multiple in-flight requests fail at once.
setUnauthorizedHandler(() => {
  if (currentSession) {
    void clearLocalSession()
  }
})

async function signIn(username: string, password: string) {
  const next = await login(username, password)
  await setSessionToken(next.token)
  await saveSession(next)
  currentSession = next
  emit()
  // Refetch so permission-gated data (e.g. comments) reflects the new user.
  await queryClient.invalidateQueries()
}

async function signOut() {
  await logout()
  await clearLocalSession()
}

///////////////////////////////////////////////////////////
// Context
///////////////////////////////////////////////////////////

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
  use(sessionRestore)
  const session = useSyncExternalStore(subscribe, getSnapshot)

  const value = useMemo<AuthContextValue>(
    () => ({ session, signIn, signOut }),
    [session],
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
