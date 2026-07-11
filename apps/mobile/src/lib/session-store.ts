import * as SecureStore from 'expo-secure-store'
import type { Session } from '~/api'

const SESSION_KEY = 'provider-session'

interface StoredSession {
  token: string
  memberId: string
  username: string
  validThru: string | null
  domain: string | null
}

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    const stored = JSON.parse(raw) as StoredSession
    return {
      token: stored.token,
      memberId: stored.memberId,
      username: stored.username,
      validThru: stored.validThru ? new Date(stored.validThru) : null,
      domain: stored.domain,
    }
  } catch {
    // Corrupted entry, treat as logged out.
    await SecureStore.deleteItemAsync(SESSION_KEY)
    return null
  }
}

export async function saveSession(session: Session): Promise<void> {
  const stored: StoredSession = {
    token: session.token,
    memberId: session.memberId,
    username: session.username,
    validThru: session.validThru ? session.validThru.toISOString() : null,
    domain: session.domain,
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(stored))
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
