/* eslint-disable react-native/no-unused-styles */
import type { ReactNode } from 'react'
import type { TextProps as BaseTextProps } from 'react-native'
import { Text as BaseText, StyleSheet } from 'react-native'
import { textStyles, type Theme } from '~/theme'
import { useTheme } from './theme-context'

export interface TextProps extends BaseTextProps {
  children?: ReactNode
  variant?: keyof typeof styles
  color?: Uncapitalize<
    Extract<
      keyof Theme,
      `foreground${string}`
    > extends `foreground${infer Rest}`
      ? Rest
      : never
  >
}

export function Text({
  children,
  variant,
  style,
  color: textColor = 'base',
  ...props
}: TextProps) {
  const theme = useTheme()
  const color = `foreground${capitalize(textColor)}` as const

  return (
    <BaseText
      style={[variant && styles[variant], { color: theme[color] }, style]}
      {...props}
    >
      {children}
    </BaseText>
  )
}

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

export const styles = StyleSheet.create({
  ...textStyles,
})
