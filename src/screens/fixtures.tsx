import type { LegendListRef } from '@legendapp/list'
import { LegendList } from '@legendapp/list'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { useSuspenseQuery } from '@tanstack/react-query'
import { formatRelative } from 'date-fns'
import type { Locale } from 'date-fns/locale'
import { sv } from 'date-fns/locale'
import { Image } from 'expo-image'
import { Suspense, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { FixtureSlim } from '~/api'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { TAB_BAR_HEIGHT } from '~/lib/layout'
import {
  fixtureEventsQuery,
  fixtureQuery,
  fixturesQuery,
  fixtureStatsQuery,
} from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { useInterval } from '~/lib/use-interval'
import type { Theme } from '~/theme'
import { colors } from '~/theme'
import { capitalizeFirstLetter } from '~/utils'

export function FixturesScreen() {
  return (
    <Suspense fallback={null}>
      <List />
    </Suspense>
  )
}

type ListItem =
  | { kind: 'header'; id: string; title: string }
  | { kind: 'fixture'; id: string; fixture: FixtureSlim; isLast: boolean }

function List() {
  const insets = useSafeAreaInsets()

  const { data } = useSuspenseQuery(fixturesQuery)

  const items = useMemo(() => buildItems(data), [data])

  const ref = useRef<LegendListRef>(null)
  useScrollToTop(
    useRef({
      scrollToTop: () =>
        ref.current?.scrollToIndex({ index: 0, viewOffset: insets.top }),
    }),
  )

  return (
    <LegendList
      ref={ref}
      data={items}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="never"
      renderScrollComponent={(props) => (
        <ScrollView
          {...props}
          scrollToOverflowEnabled
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: insets.top }}
          contentOffset={{ x: 0, y: -insets.top }}
        />
      )}
      contentContainerStyle={{
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT,
      }}
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <SectionHeader title={item.title} />
        ) : (
          <Card fixture={item.fixture} isLast={item.isLast} />
        )
      }
      estimatedItemSize={ROW_HEIGHT}
      getItemType={(item) => item.kind}
      recycleItems
    />
  )
}

// Build the list most-relevant-first so it can simply start at the top: the
// next upcoming match (soonest first) leads, followed by results (most recent
// first). For a finished season with no upcoming matches the latest result
// sits at the top. `data` is chronological (oldest first).
function buildItems(data: FixtureSlim[]): ListItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const boundary = data.findIndex((f) => f.startsAt >= today)
  const splitAt = boundary === -1 ? data.length : boundary
  const past = data.slice(0, splitAt).reverse()
  const upcoming = data.slice(splitAt)

  const items: ListItem[] = []

  const pushSection = (id: string, title: string, fixtures: FixtureSlim[]) => {
    if (fixtures.length === 0) return
    items.push({ kind: 'header', id, title })
    fixtures.forEach((fixture, i) => {
      items.push({
        kind: 'fixture',
        id: fixture.id,
        fixture,
        isLast: i === fixtures.length - 1,
      })
    })
  }

  pushSection('header-upcoming', 'Kommande matcher', upcoming)
  pushSection('header-past', 'Resultat', past)

  return items
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text variant="headingSmall">{title}</Text>
    </View>
  )
}

export const lfcLogoUrl =
  'https://res.cloudinary.com/supportersplace/image/upload/w_60,fl_lossy,f_auto,fl_progressive/files_lfc_nu/opponent/lfc-crest.png'

type Outcome = 'win' | 'loss' | 'draw' | 'upcoming'

interface CardProps {
  fixture: FixtureSlim
  isLast: boolean
}

function Card({ fixture, isLast }: CardProps) {
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

  const lfcGoals = fixture.isAwayGame ? awayGoals : homeGoals
  const oppoGoals = fixture.isAwayGame ? homeGoals : awayGoals

  const outcome: Outcome =
    fixture.result == null
      ? 'upcoming'
      : (lfcGoals ?? 0) > (oppoGoals ?? 0)
        ? 'win'
        : (lfcGoals ?? 0) < (oppoGoals ?? 0)
          ? 'loss'
          : 'draw'

  return (
    <Pressable
      style={styles.row}
      onPress={navigateToGame}
      onPressIn={prefetchGame}
    >
      <View style={styles.rowInner}>
        <View style={styles.meta}>
          <Text variant="captionMedium" color="baseMuted">
            <RelativeTime date={fixture.startsAt} />
          </Text>
          <Text
            variant="captionSmall"
            color="baseMuted"
            numberOfLines={1}
            style={styles.competition}
          >
            {fixture.type}
            {fixture.playOffType ? ` (${fixture.playOffType})` : ''}
          </Text>
        </View>

        <View style={styles.match}>
          <TeamSide
            name={fixture.isAwayGame ? fixture.oppoonent : 'Liverpool'}
            logoUrl={fixture.isAwayGame ? fixture.opponentLogoUrl : lfcLogoUrl}
            align="home"
          />

          <ScorePill
            outcome={outcome}
            label={
              fixture.result
                ? `${homeGoals} - ${awayGoals}`
                : (fixture.startsAtTime ?? '')
            }
          />

          <TeamSide
            name={fixture.isAwayGame ? 'Liverpool' : fixture.oppoonent}
            logoUrl={fixture.isAwayGame ? lfcLogoUrl : fixture.opponentLogoUrl}
            align="away"
          />
        </View>
      </View>
      {!isLast && <RowSeparator />}
    </Pressable>
  )
}

interface TeamSideProps {
  name: string
  logoUrl: string
  align: 'home' | 'away'
}

function TeamSide({ name, logoUrl, align }: TeamSideProps) {
  const logo = (
    <View style={styles.logo}>
      <Image source={logoUrl} style={styles.image} contentFit="contain" />
    </View>
  )

  return (
    <View
      style={[
        styles.team,
        { justifyContent: align === 'home' ? 'flex-end' : 'flex-start' },
      ]}
    >
      {align === 'home' ? (
        <>
          <Text
            variant="bodySmall"
            style={[styles.teamName, { textAlign: 'right' }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {logo}
        </>
      ) : (
        <>
          {logo}
          <Text variant="bodySmall" style={styles.teamName} numberOfLines={1}>
            {name}
          </Text>
        </>
      )}
    </View>
  )
}

function pillColors(theme: Theme, outcome: Outcome) {
  switch (outcome) {
    case 'win':
      return { backgroundColor: colors.green600, color: colors.white }
    case 'loss':
      return { backgroundColor: colors.red600, color: colors.white }
    default:
      return {
        backgroundColor: theme.backgroundBase,
        borderColor: theme.borderBaseMuted,
        borderWidth: StyleSheet.hairlineWidth,
        color: theme.foregroundBase,
      }
  }
}

function ScorePill({ outcome, label }: { outcome: Outcome; label: string }) {
  const theme = useTheme()
  const { color, ...container } = pillColors(theme, outcome)

  return (
    <View style={[styles.pill, container]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  )
}

function RowSeparator() {
  const theme = useTheme()

  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.borderBaseMuted,
      }}
    />
  )
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

const ROW_HEIGHT = 76
const SCREEN_PADDING = 17

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: SCREEN_PADDING,
  },
  rowInner: {
    paddingVertical: 14,
  },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
    paddingBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  competition: {
    flexShrink: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  team: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamName: {
    flexShrink: 1,
    fontWeight: 400,
  },
  logo: {
    width: 22,
    alignItems: 'center',
  },
  image: {
    height: 22,
    width: 22,
  },
  pill: {
    minWidth: 44,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
})
