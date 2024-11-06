import 'react-native-url-polyfill/auto'

import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { ThemeProvider } from '~/components/theme-context'
import { queryClient } from '~/lib/query-client'

export default function Layout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
