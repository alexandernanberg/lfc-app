import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import type { StaticScreenProps } from '@react-navigation/native'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { Suspense, useState } from 'react'
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SFSymbol from 'sweet-sfsymbols'
import type { Fixture, FixtureEvent } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { SegmentedControl } from '~/components/segmented-control'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import {
  fixtureEventsQuery,
  fixtureQuery,
  fixtureStatsQuery,
} from '~/lib/queries'
import { useDateFormatter } from '~/lib/use-date-formatter'
import { useNumberFormatter } from '~/lib/use-number-formatter'
import { colors } from '~/theme'
import { capitalizeFirstLetter } from '~/utils'

type Props = StaticScreenProps<{
  id: string
}>

export function FixturesGameScreen({ route }: Props) {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <Content id={route.params.id} />
      </Suspense>
    </ScrollProvider>
  )
}

function Content({ id }: { id: string }) {
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const { onScroll } = useScrollContext()

  // TODO: Use suspense query when it works with placeholder data
  const { data: fixture } = useQuery(fixtureQuery(id))

  if (!fixture) {
    return null
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: tabBarHeight - insets.bottom }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <FixtureResult fixture={fixture} />

      <View style={{ padding: 17, paddingBlock: 0 }}>
        <SegmentedControlsContent fixture={fixture} />
      </View>
    </ScrollView>
  )
}

///////////////////////////////////////////////////////////
// Fixture result
///////////////////////////////////////////////////////////

interface FixtureResultProps {
  fixture: Fixture
}

function FixtureResult({ fixture }: FixtureResultProps) {
  const dateFormatter = useDateFormatter('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <View
      style={{
        padding: 17,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <FixtureResultTeam
        logoUrl={fixture.imageHomeUrl}
        name={fixture.homeName}
      />

      <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
        {fixture.result ? (
          <>
            <Text variant="displayLarge" style={{ textAlign: 'center' }}>
              {fixture.result}
            </Text>
            <Text
              variant="captionLarge"
              style={{ textAlign: 'center' }}
              color="baseMuted"
            >
              {fixture.resultHalfTime ? `HT (${fixture.resultHalfTime})` : null}
            </Text>
          </>
        ) : (
          <>
            <Text variant="headingSmall" style={{ textAlign: 'center' }}>
              {capitalizeFirstLetter(dateFormatter.format(fixture.startsAt))}
            </Text>
            <Text
              variant="captionLarge"
              style={{ textAlign: 'center' }}
              color="baseMuted"
            >
              {fixture.startsAtTime}
            </Text>
          </>
        )}
      </View>

      <FixtureResultTeam
        logoUrl={fixture.imageAwayUrl}
        name={fixture.awayName}
      />
    </View>
  )
}

interface FixtureResultTeamProps {
  logoUrl: string
  name: ReactNode
}

function FixtureResultTeam({ logoUrl, name }: FixtureResultTeamProps) {
  return (
    <View
      style={{
        gap: 8,
        alignItems: 'center',
        flexBasis: '25%',
      }}
    >
      <Image
        source={logoUrl}
        style={{ width: 44, height: 44 }}
        contentFit="contain"
      />
      <Text variant="captionLarge" style={{ fontWeight: 600 }}>
        {name}
      </Text>
    </View>
  )
}

///////////////////////////////////////////////////////////
// Segmented controls content
///////////////////////////////////////////////////////////

interface SegmentedControlsContentProps {
  fixture: Fixture
}

function SegmentedControlsContent({ fixture }: SegmentedControlsContentProps) {
  const isGameFinished = !!fixture.result
  const [selectedIndex, setSelectedIndex] = useState(() => {
    return isGameFinished ? 0 : 2
  })

  return (
    <>
      <SegmentedControl
        segments={['Händelser', 'Statistik', 'Fakta']}
        disabledIndices={isGameFinished ? undefined : [0, 1]}
        selectedIndex={selectedIndex}
        onChange={setSelectedIndex}
      />
      <View style={{ paddingBlock: 24 }}>
        <Suspense fallback={null}>
          {(() => {
            switch (selectedIndex) {
              case 0:
                return <Events fixture={fixture} />

              case 1:
                return <Stats fixture={fixture} />

              case 2:
                return <MatchInfo fixture={fixture} />

              default:
                return null
            }
          })()}
        </Suspense>
      </View>
    </>
  )
}

///////////////////////////////////////////////////////////
// Events
///////////////////////////////////////////////////////////

interface EventsProps {
  fixture: Fixture
}

function Events({ fixture }: EventsProps) {
  const theme = useTheme()
  const { data } = useSuspenseQuery(fixtureEventsQuery(fixture.id))

  return (
    <View style={{ gap: 24 }}>
      {data.map((i) => {
        const isHome = i.isLiverpool === !fixture.isAwayGame

        return (
          <View
            key={i.id}
            style={{
              flexDirection: isHome ? 'row' : 'row-reverse',
              gap: 24,
              alignSelf: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flex: 1,
                alignItems: isHome ? 'flex-end' : 'flex-start',
              }}
            >
              {(() => {
                switch (i.type) {
                  case 'goal':
                    return (
                      <>
                        <Text
                          variant="captionLarge"
                          style={{ fontWeight: 500 }}
                        >
                          {i.player}
                        </Text>
                        {i.assist && (
                          <Text variant="captionSmall">Assist: {i.assist}</Text>
                        )}
                      </>
                    )
                  case 'penalty_goal':
                    return (
                      <>
                        <Text
                          variant="captionLarge"
                          style={{ fontWeight: 500 }}
                        >
                          {i.player}
                        </Text>
                        <Text variant="captionSmall">Straff</Text>
                      </>
                    )
                  case 'penalty_miss':
                    return (
                      <>
                        <Text
                          variant="captionLarge"
                          style={{ fontWeight: 500 }}
                        >
                          {i.player}
                        </Text>
                        <Text variant="captionSmall">Missad straff</Text>
                      </>
                    )
                  case 'own_goal':
                    return (
                      <>
                        <Text
                          variant="captionLarge"
                          style={{ fontWeight: 500 }}
                        >
                          {i.player}
                        </Text>
                        <Text variant="captionSmall">Självmål</Text>
                      </>
                    )

                  case 'substitution':
                    return (
                      <>
                        <Text
                          variant="captionLarge"
                          style={{ color: colors.green500 }}
                        >
                          {i.inPlayer}
                        </Text>
                        <Text
                          variant="captionSmall"
                          style={{ color: colors.red500 }}
                        >
                          {i.outPlayer}
                        </Text>
                      </>
                    )

                  default:
                    return <Text variant="captionLarge">{i.player}</Text>
                }
              })()}
            </View>
            <View
              style={{
                padding: 8,
                borderColor: theme.borderBase,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: 40,
              }}
            >
              <EventSymbol type={i.type} />
            </View>
            <Text
              variant="captionLarge"
              style={{
                flex: 1,
                textAlign: isHome ? 'left' : 'right',
                fontWeight: 500,
              }}
            >
              {i.minute}&apos;
            </Text>
          </View>
        )
      })}
    </View>
  )
}

interface EventSymbolProps {
  type: FixtureEvent['type']
}

function EventSymbol({ type }: EventSymbolProps) {
  const theme = useTheme()

  switch (type) {
    case 'goal':
    case 'penalty_goal':
    case 'own_goal':
      return (
        <SFSymbol
          name={'soccerball.inverse'}
          weight="regular"
          scale="medium"
          colors={[theme.foregroundBase]}
          size={13}
        />
      )
    case 'penalty_miss':
      return (
        <SFSymbol
          name={'xmark'}
          weight="regular"
          scale="medium"
          colors={[colors.red500]}
          size={13}
        />
      )
    case 'second_yellow_card':
      return (
        <SFSymbol
          name={'rectangle.portrait.on.rectangle.portrait.angled.fill'}
          weight="regular"
          scale="medium"
          renderingMode="palette"
          colors={[colors.yellow400, colors.red500]}
          size={13}
        />
      )
    case 'yellow_card':
      return (
        <SFSymbol
          name={'rectangle.portrait.fill'}
          weight="regular"
          scale="medium"
          colors={[colors.yellow400]}
          size={13}
        />
      )
    case 'red_card':
      return (
        <SFSymbol
          name={'rectangle.portrait.fill'}
          scale="medium"
          colors={[colors.red400]}
          size={13}
        />
      )
    case 'substitution':
      return (
        <SFSymbol
          name="arrow.left.arrow.right"
          scale="medium"
          renderingMode="palette"
          colors={[colors.green500, colors.red500]}
          size={13}
        />
      )
  }
}

///////////////////////////////////////////////////////////
// Match info
///////////////////////////////////////////////////////////

interface MatchInfoProps {
  fixture: Fixture
}

function MatchInfo({ fixture }: MatchInfoProps) {
  const dateFormatter = useDateFormatter('sv-SE', { dateStyle: 'long' })
  const numberFormatter = useNumberFormatter('sv-SE')

  return (
    <View style={{ gap: 12 }}>
      <MatchInfoRow label="Arena">{fixture.arena}</MatchInfoRow>
      <Separator />
      <MatchInfoRow label="Datum">
        {dateFormatter.format(fixture.startsAt)}
      </MatchInfoRow>
      <Separator />
      <MatchInfoRow label="Tid">{fixture.startsAtTime}</MatchInfoRow>
      <Separator />
      <MatchInfoRow label="Åskådare">
        {fixture.attendence !== 0
          ? numberFormatter.format(fixture.attendence)
          : '-'}
      </MatchInfoRow>
      <Separator />
      <MatchInfoRow label="Domare">{fixture.referee?.name ?? '-'}</MatchInfoRow>
    </View>
  )
}

interface MatchInfoRowProps {
  label: ReactNode
  children: ReactNode
}

function MatchInfoRow({ label, children }: MatchInfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text variant="bodySmall">{label}</Text>
      <Text variant="bodySmall" style={{ fontWeight: 500 }}>
        {children}
      </Text>
    </View>
  )
}

///////////////////////////////////////////////////////////
// Stats
///////////////////////////////////////////////////////////

interface StatsProps {
  fixture: Fixture
}

function Stats({ fixture }: StatsProps) {
  const { data: stats } = useSuspenseQuery(fixtureStatsQuery(fixture.id))

  return (
    <View style={{ gap: 16 }}>
      <StatRow
        label="Bollinnehav"
        homeValue={stats.homeTeam.possession}
        awayValue={stats.awayTeam.possession}
        formatOptions={{
          style: 'percent',
        }}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Passningar"
        homeValue={stats.homeTeam.passes}
        awayValue={stats.awayTeam.passes}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Avslut"
        homeValue={stats.homeTeam.shots}
        awayValue={stats.awayTeam.shots}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Avslut på mål"
        homeValue={stats.homeTeam.shotsOnGoal}
        awayValue={stats.awayTeam.shotsOnGoal}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Röda kort"
        homeValue={stats.homeTeam.red}
        awayValue={stats.awayTeam.red}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Gula kort"
        homeValue={stats.homeTeam.yellow}
        awayValue={stats.awayTeam.yellow}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Offsides"
        homeValue={stats.homeTeam.offsides}
        awayValue={stats.awayTeam.offsides}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Frisparkar"
        homeValue={stats.homeTeam.misconduct}
        awayValue={stats.awayTeam.misconduct}
        isAwayGame={fixture.isAwayGame}
      />
      <StatRow
        label="Hörnor"
        homeValue={stats.homeTeam.corners}
        awayValue={stats.awayTeam.corners}
        isAwayGame={fixture.isAwayGame}
      />
    </View>
  )
}

interface StatRowProps {
  label: ReactNode
  homeValue: number
  awayValue: number
  isAwayGame: boolean
  formatOptions?: Intl.NumberFormatOptions
}

function StatRow({
  label,
  homeValue,
  awayValue,
  isAwayGame,
  formatOptions,
}: StatRowProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const numberFormatter = useNumberFormatter('sv-SE', formatOptions)

  const valueSum = homeValue + awayValue

  const lfcColor = colorScheme === 'light' ? colors.red500 : colors.red600
  const lfcBarColor = colorScheme === 'light' ? colors.red400 : colors.red700
  const opponentColor =
    colorScheme === 'light' ? colors.gray500 : colors.gray800
  const opponentBarColor =
    colorScheme === 'light' ? colors.gray300 : colors.gray900

  return (
    <View>
      <View style={statsStyles.textContainer}>
        <View style={statsStyles.valueLabelContainer}>
          <Text
            variant="captionLarge"
            style={[
              homeValue > awayValue && [
                statsStyles.valueLabelText,
                { backgroundColor: !isAwayGame ? lfcColor : opponentColor },
              ],
            ]}
          >
            {numberFormatter.format(homeValue)}
          </Text>
        </View>

        <Text variant="captionLarge" style={statsStyles.label}>
          {label}
        </Text>

        <View
          style={[statsStyles.valueLabelContainer, { alignItems: 'flex-end' }]}
        >
          <Text
            variant="captionLarge"
            style={[
              awayValue > homeValue && [
                statsStyles.valueLabelText,
                { backgroundColor: isAwayGame ? lfcColor : opponentColor },
              ],
            ]}
          >
            {numberFormatter.format(awayValue)}
          </Text>
        </View>
      </View>
      <View style={statsStyles.bars}>
        <View
          style={[
            statsStyles.bar,
            {
              backgroundColor: !isAwayGame ? lfcBarColor : opponentBarColor,
              flexBasis: `${valueSum > 0 ? (homeValue / valueSum) * 100 : 50}%`,
            },
          ]}
        />
        <View
          style={[
            statsStyles.bar,
            {
              flexBasis: `${valueSum > 0 ? (awayValue / valueSum) * 100 : 50}%`,
              backgroundColor: isAwayGame ? lfcBarColor : opponentBarColor,
            },
          ]}
        />
      </View>
    </View>
  )
}

const statsStyles = StyleSheet.create({
  textContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },

  label: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    textAlign: 'center',
  },

  valueLabelContainer: {
    flexBasis: '20%',
    alignItems: 'flex-start',
  },

  valueLabelText: {
    paddingBlock: 2,
    paddingInline: 5,
    color: 'white',
    borderRadius: 6,
    fontWeight: 700,
  },

  bars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },

  bar: {
    height: 4,
    minWidth: 4,
    borderRadius: 40,
  },
})
