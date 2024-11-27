import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type {
  Theme as NavigationTheme,
  StaticParamList,
} from '@react-navigation/native'
import {
  createStaticNavigation,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { BlurView } from 'expo-blur'
import type { ColorSchemeName } from 'react-native'
import { StyleSheet } from 'react-native'
import SFSymbol from 'sweet-sfsymbols'
import { FixturesScreen } from './screens/fixtures'
import { NewsfeedScreen } from './screens/newsfeed'
import {
  NewsfeedPostScreen,
  NewsfeedPostShareButton,
} from './screens/newsfeed-post'
import { alphaColor, themes } from './theme'

const NewsfeedNavigator = createNativeStackNavigator({
  initialRouteName: 'Feed',
  screenOptions: {
    headerShadowVisible: false,
    headerTransparent: true,
  },
  screens: {
    Feed: {
      screen: NewsfeedScreen,
      options: {
        title: 'Nyheter',
        headerShown: false,
      },
    },
    Post: {
      screen: NewsfeedPostScreen,
      options: {
        title: '',
        headerRight: () => <NewsfeedPostShareButton />,
      },
    },
  },
})

const FixturesNavigator = createNativeStackNavigator({
  initialRouteName: 'Feed',
  screenOptions: {
    headerShadowVisible: false,
    headerTransparent: true,
  },
  screens: {
    Feed: {
      screen: FixturesScreen,
      options: {
        headerShown: false,
      },
    },
  },
})

const HomeTabs = createBottomTabNavigator({
  screenOptions: ({ theme: { dark } }) => {
    const theme = themes[dark ? 'dark' : 'light']

    return {
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: alphaColor(theme.backgroundBase, 0.6),
      },
      // tabBarActiveTintColor: theme.foregroundBase,
      // tabBarInactiveTintColor: theme.foregroundBaseFaded,
      tabBarBackground: () => (
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
      ),
    }
  },
  screens: {
    Newsfeed: {
      screen: NewsfeedNavigator,
      options: {
        title: 'Nyheter',
        tabBarIcon: ({ color, focused, size }) => {
          const iconName = focused
            ? ('newspaper.fill' as const)
            : ('newspaper' as const)
          return (
            <SFSymbol
              name={iconName}
              weight="regular"
              scale="small"
              colors={[color]}
              size={size}
            />
          )
        },
      },
    },
    Fixtures: {
      screen: FixturesNavigator,
      options: {
        title: 'Matcher',
        tabBarIcon: ({ color, focused, size }) => {
          const iconName = focused
            ? ('sportscourt.fill' as const)
            : ('sportscourt' as const)
          return (
            <SFSymbol
              name={iconName}
              weight="regular"
              scale="small"
              colors={[color]}
              size={size}
            />
          )
        },
      },
    },
  },
})

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: {
      screen: HomeTabs,
      options: {
        headerShown: false,
      },
    },
  },
})

export const Navigation = createStaticNavigation(RootStack)

type RootStackParamList = StaticParamList<typeof RootStack>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    background: themes.dark.backgroundBase,
    card: alphaColor(themes.dark.backgroundBase, 0.6),
    border: themes.dark.borderBase,
    text: themes.dark.foregroundBase,
    notification: themes.dark.foregroundAction,
    primary: themes.dark.foregroundAction,
  },
} satisfies NavigationTheme

const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    background: themes.light.backgroundBase,
    card: alphaColor(themes.light.backgroundBase, 0.6),
    border: themes.light.borderBase,
    notification: themes.light.foregroundAction,
    text: themes.light.foregroundBase,
    primary: themes.light.foregroundAction,
  },
} satisfies NavigationTheme

export function getNavigationTheme(colorScheme: ColorSchemeName) {
  return colorScheme === 'dark' ? navigationDarkTheme : navigationLightTheme
}
