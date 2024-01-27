import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import 'react-native-url-polyfill/auto'
import { queryClient } from '~/lib/query-client'

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  )
}
