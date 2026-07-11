import { QueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './text'
import { useTheme } from './theme-context'

interface QueryBoundaryProps {
  children: ReactNode
  // Shown while the suspended children load. Defaults to nothing, matching the
  // screens' previous `Suspense fallback={null}`.
  pending?: ReactNode
}

/**
 * Wraps a data-driven subtree so a failed query renders a retry UI instead of
 * propagating up to a blank screen. The reset from React Query's
 * `QueryErrorResetBoundary` clears the errored queries when the user retries, so
 * the Suspense boundary re-runs them rather than immediately re-throwing.
 */
export function QueryBoundary({ children, pending }: QueryBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          <Suspense fallback={pending ?? null}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <Text variant="headingSmall" style={styles.title}>
        Något gick fel
      </Text>
      <Text color="baseMuted" variant="bodySmall" style={styles.message}>
        Det gick inte att hämta innehållet. Kontrollera din anslutning och
        försök igen.
      </Text>
      <Pressable
        onPress={resetErrorBoundary}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.foregroundAction,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text
          variant="bodyMedium"
          style={[styles.buttonText, { color: theme.backgroundBase }]}
        >
          Försök igen
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 600,
  },
})
