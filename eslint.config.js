import baseConfig from 'eslint-config-alexandernanberg/base'
import reactConfig from 'eslint-config-alexandernanberg/react'
import { defineConfig } from 'eslint/config'
import reactNative from 'eslint-plugin-react-native'

export default defineConfig([
  ...baseConfig,
  ...reactConfig,
  {
    plugins: {
      'react-native': reactNative,
    },
    settings: {
      'import/ignore': ['react-native'],
    },
    rules: {
      'react-native/no-unused-styles': 'error',
      'import/no-extraneous-dependencies': 'off',
    },
  },
])
