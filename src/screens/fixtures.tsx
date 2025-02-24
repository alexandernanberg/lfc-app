import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { useSuspenseQuery } from '@tanstack/react-query'
import { formatRelative } from 'date-fns'
import type { Locale } from 'date-fns/locale'
import { sv } from 'date-fns/locale'
import { Image } from 'expo-image'
import { Suspense, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { FixtureSlim } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import {
  fixtureEventsQuery,
  fixtureQuery,
  fixturesQuery,
  fixtureStatsQuery,
} from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { useInterval } from '~/lib/use-interval'
import { capitalizeFirstLetter } from '~/utils'

export function FixturesScreen() {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <List />
      </Suspense>
    </ScrollProvider>
  )
}

function List() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { onScroll, offsetY } = useScrollContext()

  const { data } = useSuspenseQuery(fixturesQuery)

  const lastFixture = useMemo(() => findLastFixture(data), [data])
  const lastFixtureIndex = lastFixture ? data.indexOf(lastFixture) : 0

  const ref = useRef<FlatList<FixtureSlim>>(null)
  useScrollToTop(
    useRef({
      scrollToTop: () =>
        ref.current?.scrollToIndex({
          index: lastFixtureIndex,
          viewOffset: -offsetY,
        }),
    }),
  )

  return (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: tabBarHeight - insets.bottom }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      scrollToOverflowEnabled
      style={{
        paddingHorizontal: 17,
      }}
      renderItem={({ item }) => <Card key={item.id} fixture={item} />}
      getItemLayout={(_, index) => ({
        index,
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
      })}
      ItemSeparatorComponent={Separator}
      initialNumToRender={lastFixtureIndex + 10}
      initialScrollIndex={lastFixtureIndex}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  )
}

const lfcLogoUrl =
  'https://res.cloudinary.com/supportersplace/image/upload/w_60,fl_lossy,f_auto,fl_progressive/files_lfc_nu/opponent/lfc-crest.png'

interface CardProps {
  fixture: FixtureSlim
}

function Card({ fixture }: CardProps) {
  const navigation = useNavigation()

  const navigateToGame = () => {
    navigation.navigate('Home', {
      screen: 'Fixtures',
      params: {
        screen: 'Game',
        params: {
          id: fixture.id,
        },
      },
    })
  }

  const prefetchGame = () => {
    void queryClient.prefetchQuery(fixtureQuery(fixture.id))
    void queryClient.prefetchQuery(fixtureEventsQuery(fixture.id))
    void queryClient.prefetchQuery(fixtureStatsQuery(fixture.id))
  }

  const [homeGoals, awayGoals] =
    fixture.result?.split('-').map((i) => parseInt(i)) ?? []

  return (
    <Pressable
      style={styles.card}
      onPress={navigateToGame}
      onPressIn={prefetchGame}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Text variant="captionLarge" color="baseMuted">
            <RelativeTime date={fixture.startsAt} />
          </Text>
          <Text variant="captionLarge" color="baseMuted">
            {fixture.type} {fixture.playOffType && `(${fixture.playOffType})`}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
          }}
        >
          <Text
            variant="bodySmall"
            style={{
              fontVariant: ['tabular-nums'],
            }}
            color="baseMuted"
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
              winner={(homeGoals ?? 0) > (awayGoals ?? 0)}
            />
            <TeamRow
              name={fixture.isAwayGame ? 'Liverpool' : fixture.oppoonent}
              logoUrl={
                fixture.isAwayGame ? lfcLogoUrl : fixture.opponentLogoUrl
              }
              goals={awayGoals}
              winner={(awayGoals ?? 0) > (homeGoals ?? 0)}
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
  goals: number | null | undefined
  winner: boolean
}

function TeamRow({ name, logoUrl, goals, winner }: TeamRowProps) {
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
          variant="bodySmall"
          style={[
            {
              width: 14,
              fontWeight: winner ? 600 : 400,
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
        variant="bodySmall"
        style={[{ fontWeight: winner ? 600 : 400 }]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  )
}

function findLastFixture(data: FixtureSlim[]): FixtureSlim | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let start = 0
  let end = data.length - 1

  if (data.length === 0 || data[0]!.startsAt >= today) return null

  while (start < end) {
    const mid = Math.ceil((start + end) / 2)

    if (data[mid]!.startsAt < today) {
      start = mid
    } else {
      end = mid - 1
    }
  }

  return data[start]!.startsAt < today ? data[start]! : null
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

const ROW_HEIGHT = 100

const styles = StyleSheet.create({
  card: {
    paddingVertical: 17,
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    height: ROW_HEIGHT,
  },
  image: {
    height: 17,
    width: 17,
  },
})
