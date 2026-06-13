import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
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
import type { ColorSchemeName } from 'react-native'
import { FixturesScreen } from './screens/fixtures'
import { FixturesGameScreen } from './screens/fixtures-game'
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
        title: 'Matcher',
        headerShown: false,
      },
    },
    Game: {
      screen: FixturesGameScreen,
      options: {
        title: '',
      },
    },
  },
})

const HomeTabs = createNativeBottomTabNavigator({
  screenOptions: ({ theme }) => {
    return {
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
    }
  },
  screens: {
    Newsfeed: {
      screen: NewsfeedNavigator,
      options: {
        title: 'Nyheter',
        tabBarIcon: ({ focused }) => ({
          type: 'sfSymbol',
          name: focused ? 'newspaper.fill' : 'newspaper',
        }),
      },
    },
    Fixtures: {
      screen: FixturesNavigator,
      options: {
        title: 'Matcher',
        tabBarIcon: ({ focused }) => ({
          type: 'sfSymbol',
          name: focused ? 'sportscourt.fill' : 'sportscourt',
        }),
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
