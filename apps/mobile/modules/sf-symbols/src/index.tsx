import { requireNativeViewManager } from 'expo-modules-core'
import type { ColorValue, ViewStyle } from 'react-native'
import { processColor } from 'react-native'
import type { SFSymbol as SFSymbolName } from 'sf-symbols-typescript'

export type SFSymbolWeight =
  | 'ultraLight'
  | 'thin'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black'

export type SFSymbolScale = 'small' | 'medium' | 'large'

export type SFSymbolRenderingMode =
  | 'monochrome'
  | 'hierarchical'
  | 'palette'
  | 'multicolor'

export type SFSymbolProps = {
  name: SFSymbolName
  size: number
  colors?: ColorValue[]
  weight?: SFSymbolWeight
  scale?: SFSymbolScale
  renderingMode?: SFSymbolRenderingMode
  style?: ViewStyle
}

const NativeView: React.ComponentType<
  Omit<SFSymbolProps, 'colors'> & {
    colors: ReturnType<typeof processColor>[]
  }
> = requireNativeViewManager('SFSymbols')

export default function SFSymbol({
  size,
  colors,
  style,
  ...props
}: SFSymbolProps) {
  return (
    <NativeView
      {...props}
      size={size}
      colors={(colors ?? []).map(processColor)}
      style={{ width: size, height: size, ...style }}
    />
  )
}
