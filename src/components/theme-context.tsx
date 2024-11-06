import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { useColorScheme } from 'react-native'
import type { Theme } from '~/theme'
import { themes } from '~/theme'

const ThemeContext = createContext<Theme>(themes.light)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const theme = themes[colorScheme]

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
