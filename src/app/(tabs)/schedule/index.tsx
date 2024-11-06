import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useSuspenseQuery } from '@tanstack/react-query'
import { formatRelative } from 'date-fns'
import type { Locale } from 'date-fns/locale'
import { sv } from 'date-fns/locale'
import { Image } from 'expo-image'
import { Stack } from 'expo-router'
import { Suspense, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Fixture } from '~/api'
import { listFixtures } from '~/api'
import { useTheme } from '~/components/theme-context'
import { useInterval } from '~/lib/use-interval'
import { capitalizeFirstLetter } from '~/utils'

export default function App() {
  return (
    <>
      <Stack.Screen options={{ title: 'Spelschema' }} />
      <View style={styles.container}>
        <Suspense
          fallback={
            <View style={styles.loader}>
              <ActivityIndicator />
            </View>
          }
        >
          <List />
        </Suspense>
      </View>
    </>
  )
}

function List() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()

  const { data } = useSuspenseQuery({
    queryKey: ['fixtures'],
    queryFn: () => listFixtures(),
  })

  const nextFixture = useMemo(() => findNextFixture(data), [data])
  const index = nextFixture ? data.indexOf(nextFixture) : 0

  let contentOffset = index * 98.7
  if (contentOffset > 0) {
    contentOffset -= 98.7 * 2
  }

  return (
    <ScrollView
      contentInset={{ top: insets.top, bottom: tabBarHeight }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      contentOffset={{ y: contentOffset, x: 0 }}
      style={{
        paddingHorizontal: 17,
      }}
    >
      {data.map((item) => (
        <Card key={item.id} fixture={item} />
      ))}
    </ScrollView>
  )
}

const lfcLogoUrl =
  'https://res.cloudinary.com/supportersplace/image/upload/w_60,fl_lossy,f_auto,fl_progressive/files_lfc_nu/opponent/lfc-crest.png'

interface CardProps {
  fixture: Fixture
}

function Card({ fixture }: CardProps) {
  const theme = useTheme()

  const [homeGoals, awayGoals] =
    fixture.result?.split('-').map((i) => parseInt(i)) ?? []

  return (
    <Pressable style={{ ...styles.card, borderBottomColor: theme.borderBase }}>
      <View style={{ gap: 0, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1,
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: theme.foregroundBaseFaded, fontSize: 13 }}>
            <RelativeTime date={fixture.startsAt} />
          </Text>
          <Text style={{ color: theme.foregroundBaseFaded, fontSize: 13 }}>
            {fixture.type} {fixture.playOffType && `(${fixture.playOffType})`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text
            style={{
              fontVariant: ['tabular-nums'],
              // width: 38,
              color: theme.foregroundBase,
            }}
            numberOfLines={1}
          >
            {!fixture.result ? fixture.startsAtTime : 'FT'}
          </Text>
          <View style={{ gap: 4 }}>
            <TeamRow
              name={!fixture.isAwayGame ? 'Liverpool' : fixture.oppoonent}
              logoUrl={
                !fixture.isAwayGame ? lfcLogoUrl : fixture.opponentLogoUrl
              }
              goals={homeGoals}
              winner={homeGoals > awayGoals}
            />
            <TeamRow
              name={fixture.isAwayGame ? 'Liverpool' : fixture.oppoonent}
              logoUrl={
                fixture.isAwayGame ? lfcLogoUrl : fixture.opponentLogoUrl
              }
              goals={awayGoals}
              winner={awayGoals > homeGoals}
            />
          </View>
        </View>
      </View>
    </Pressable>
  )
}

interface TeamRowProps {
  name: string
  logoUrl: string
  goals: number | null
  winner: boolean
}

function TeamRow({ name, logoUrl, goals, winner }: TeamRowProps) {
  const theme = useTheme()
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {goals != null && (
        <Text
          style={[
            {
              color: theme.foregroundBase,
              fontSize: 15,
              width: 14,
              fontWeight: winner ? '600' : '400',
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
            },
          ]}
        >
          {goals}
        </Text>
      )}
      <View style={{ width: 20, alignItems: 'center' }}>
        <Image source={logoUrl} style={styles.image} contentFit="contain" />
      </View>
      <Text
        style={[
          {
            color: theme.foregroundBase,
            fontSize: 15,
            fontWeight: winner ? '600' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  )
}

function findNextFixture(data: Fixture[]): Fixture | null {
  const today: Date = new Date()
  today.setHours(0, 0, 0, 0)

  let start = 0
  let end = data.length - 1

  if (data.length === 0 || data[end].startsAt < today) return null

  while (start < end) {
    const mid: number = Math.floor((start + end) / 2)
    const currentDate: Date = data[mid].startsAt
    currentDate.setHours(0, 0, 0, 0)

    if (currentDate < today) {
      start = mid + 1
    } else {
      end = mid
    }
  }

  return data[start]
}

const formatRelativeLocale = {
  lastWeek: "'i' eeee's'",
  yesterday: "'igår'",
  today: "'idag'",
  tomorrow: "'imorgon'",
  nextWeek: "'på' eeee",
  other: 'eee, e MMM',
}

const locale = {
  ...sv,
  formatRelative: (token) => formatRelativeLocale[token],
} satisfies Locale

function useRelativeTimeFormatter(date: Date) {
  function format(d: Date) {
    const now = new Date()
    return formatRelative(d, now, { locale })
  }

  const [value, setValue] = useState(() => format(date))

  useInterval(() => {
    setValue(format(date))
  }, 60_000)

  return value
}

interface RelativeTimeProps {
  date: Date
}

function RelativeTime({ date }: RelativeTimeProps) {
  return capitalizeFirstLetter(useRelativeTimeFormatter(date))
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingVertical: 17,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    gap: 12,
    borderBottomWidth: 1,
  },
  image: {
    height: 17,
    width: 17,
    // aspectRatio: '1/1'
  },
  // title: {
  //   fontSize: 17,
  //   fontWeight: '600',
  //   lineHeight: 22,
  //   minWidth: 0,
  //   flexShrink: 1,
  //   marginBottom: 12,
  // },
})
