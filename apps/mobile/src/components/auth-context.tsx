import type { ReactNode } from 'react'
import {
  createContext,
  use,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'
import type { Session } from '~/api'
import { login, logout, setUnauthorizedHandler } from '~/api'
import { memberQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import {
  clearSession,
  getSession,
  restoreSession,
  setSession,
  subscribeSession,
} from '~/lib/session'
import { withTimeout } from '~/lib/timeout'

///////////////////////////////////////////////////////////
// Auth store
///////////////////////////////////////////////////////////
//
// Session state (persistence, transport cookie, in-memory snapshot) is owned by
// `~/lib/session` — the single source of truth. This module orchestrates the
// auth *flow* on top of it: sign in/out, restore on launch, and dropping the
// session on a 401. Components read the session with `useSyncExternalStore`.

// Restore the persisted session once, at module load. `restoreSession` also
// primes the cookie, so it's in place before any authenticated request fires.
// The promise is consumed with `use()`, so the provider suspends until it
// resolves. Bounded by a timeout and never rejects: `restoreSession` calls
// into native modules (SecureStore, the cookie jar) with no timeout of their
// own, and this being the sole `use()` above the whole app means a hang or an
// uncaught rejection here would wedge the splash screen forever. Worst case on
// timeout/failure, the app boots logged out rather than never booting.
const sessionRestore = withTimeout(
  restoreSession(),
  8000,
  'Session restore timed out',
)
  .then((restored) => {
    if (!restored) {
      return
    }
    // Validate the restored session against the member endpoint. A 401 trips
    // the global handler below and clears it; prefetching (rather than a
    // direct call) means the profile screen reuses the result instead of
    // fetching twice.
    void queryClient.prefetchQuery(memberQuery(restored.token))
  })
  .catch((error: unknown) => {
    console.warn('[auth] session restore failed:', error)
  })

// A 401 from any endpoint means the session is no longer valid — drop it. The
// guard avoids redundant work when multiple in-flight requests fail at once.
setUnauthorizedHandler(() => {
  if (getSession()) {
    void clearSession().then(() => queryClient.invalidateQueries())
  }
})

async function signIn(username: string, password: string) {
  const next = await login(username, password)
  await setSession(next)
  // Refetch so permission-gated data (e.g. comments) reflects the new user.
  await queryClient.invalidateQueries()
}

async function signOut() {
  await logout()
  await clearSession()
  await queryClient.invalidateQueries()
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
  const session = useSyncExternalStore(subscribeSession, getSession)

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
