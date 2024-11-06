export const colors = {
  black: '#000000',
  white: '#ffffff',
  transparent: 'rgba(0,0,0,0)',

  gray50: '#fafaf9',
  gray100: '#f5f5f4',
  gray200: '#e7e6e5',
  gray300: '#d6d5d4',
  gray400: '#b0afae',
  gray500: '#8f8d8c',
  gray600: '#737270',
  gray700: '#5c5a58',
  gray800: '#4a4847',
  gray900: '#201F1E',
  gray950: '#121111',

  yellow50: '#fefce8',
  yellow100: '#fef9c3',
  yellow200: '#fef08a',
  yellow300: '#ffe34f',
  yellow400: '#facc14',
  yellow500: '#cc8604',
  yellow600: '#a86307',
  yellow700: '#874b0e',
  yellow800: '#693a11',
  yellow900: '#4f2a0a',
  yellow950: '#2b1605',

  red50: '#fef3f2',
  red100: '#fee6e5',
  red200: '#fed3d0',
  red300: '#ffb8b5',
  red400: '#fc868a',
  red500: '#fa4b57',
  red600: '#a91c30',
  red700: '#b51b30',
  red800: '#8f192d',
  red900: '#661623',
  red950: '#380810',

  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#8befaf',
  green400: '#35cc6d',
  green500: '#1ba858',
  green600: '#14854c',
  green700: '#146941',
  green800: '#0f4f33',
  green900: '#0c3d29',
  green950: '#042419',
} as const

export interface Theme {
  backgroundBase: string
  backgroundBaseElevated: string

  foregroundBase: string
  foregroundBaseFaded: string
  foregroundAction: string

  borderBase: string
}

export const themes: Record<'light' | 'dark', Theme> = {
  light: {
    backgroundBase: colors.white,
    backgroundBaseElevated: colors.gray100,

    foregroundBase: colors.gray950,
    foregroundBaseFaded: colors.gray600,
    foregroundAction: colors.red600,

    borderBase: colors.gray100,
  },
  dark: {
    backgroundBase: colors.black,
    backgroundBaseElevated: colors.gray900,

    foregroundBase: colors.gray200,
    foregroundBaseFaded: colors.gray500,
    foregroundAction: colors.red500,

    borderBase: colors.gray900,
  },
}

function numberToHex(value: number): string {
  if (value < 0 || value > 1) {
    throw new Error('Value must be between 0 and 1')
  }
  const hexValue = Math.round(value * 255)
    .toString(16)
    .padStart(2, '0')
  return hexValue
}

export function alphaColor(color: string, alphaValue: number) {
  return `${color}${numberToHex(alphaValue)}`
}
