import { useScrollToTop } from '@react-navigation/native'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Suspense, useRef } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Standing } from '~/api'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { TAB_BAR_HEIGHT } from '~/lib/layout'
import { standingQuery } from '~/lib/queries'
import { lfcLogoUrl } from '~/screens/fixtures'
import { alphaColor, colors } from '~/theme'

export function StandingScreen() {
  return (
    <Suspense fallback={null}>
      <Table />
    </Suspense>
  )
}

function Table() {
  const insets = useSafeAreaInsets()

  const { data, isRefetching, refetch } = useSuspenseQuery(standingQuery)

  const ref = useRef<ScrollView>(null)
  useScrollToTop(
    useRef({
      scrollToTop: () =>
        ref.current?.scrollTo({ y: -insets.top, animated: true }),
    }),
  )

  return (
    <ScrollView
      ref={ref}
      scrollToOverflowEnabled
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      contentInset={{ top: insets.top }}
      contentOffset={{ x: 0, y: -insets.top }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <HeaderRow />

      {data.map((row, index) => (
        <Row
          key={row.team}
          row={row}
          total={data.length}
          isLast={index === data.length - 1}
        />
      ))}

      <Legend />
    </ScrollView>
  )
}

function HeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text
        variant="captionSmall"
        color="baseMuted"
        style={[styles.posCell, styles.headerText]}
      >
        #
      </Text>
      <View style={styles.crestSpacer} />
      <Text
        variant="captionSmall"
        color="baseMuted"
        style={[styles.teamCell, styles.headerText]}
      >
        Lag
      </Text>
      <HeaderStat label="S" />
      <HeaderStat label="MS" />
      <HeaderStat label="P" points />
    </View>
  )
}

function HeaderStat({ label, points }: { label: string; points?: boolean }) {
  return (
    <Text
      variant="captionSmall"
      color="baseMuted"
      style={[styles.statCell, points && styles.pointsCell, styles.headerText]}
    >
      {label}
    </Text>
  )
}

// Premier League qualification colours: top four reach the Champions League,
// fifth place the Europa League, and the bottom three are relegated.
function positionAccent(position: number, total: number): string | null {
  if (position <= 4) return colors.green500
  if (position === 5) return colors.yellow400
  if (position > total - 3) return colors.red500
  return null
}

interface RowProps {
  row: Standing
  total: number
  isLast: boolean
}

function Row({ row, total, isLast }: RowProps) {
  const theme = useTheme()
  const accent = positionAccent(row.position, total)

  const goalDifference =
    row.goalDifference > 0 ? `+${row.goalDifference}` : `${row.goalDifference}`

  return (
    <View
      style={[
        styles.row,
        row.isLiverpool && {
          backgroundColor: alphaColor(theme.foregroundAction, 0.1),
        },
      ]}
    >
      {accent && (
        <View style={[styles.accent, { backgroundColor: accent }]} />
      )}

      {!isLast && (
        <View
          style={[styles.separator, { backgroundColor: theme.borderBaseMuted }]}
        />
      )}

      <Text variant="bodySmall" style={[styles.posCell, styles.posText]}>
        {row.position}
      </Text>

      <Image
        source={row.isLiverpool ? lfcLogoUrl : row.crestUrl}
        style={styles.crest}
        contentFit="contain"
      />

      <Text
        variant="bodySmall"
        numberOfLines={1}
        style={[styles.teamCell, row.isLiverpool && styles.teamCellActive]}
      >
        {row.team}
      </Text>

      <Stat value={row.played} />
      <Stat value={goalDifference} />
      <Stat value={row.points} points />
    </View>
  )
}

function Stat({
  value,
  points,
}: {
  value: number | string
  points?: boolean
}) {
  return (
    <Text
      variant="bodySmall"
      color={points ? 'base' : 'baseMuted'}
      style={[styles.statCell, points && styles.pointsCell]}
    >
      {value}
    </Text>
  )
}

function Legend() {
  return (
    <View style={styles.legend}>
      <LegendItem color={colors.green500} label="Champions League" />
      <LegendItem color={colors.yellow400} label="Europa League" />
      <LegendItem color={colors.red500} label="Nedflyttning" />
    </View>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="captionMedium" color="baseMuted">
        {label}
      </Text>
    </View>
  )
}

const SCREEN_PADDING = 17
const CREST_SIZE = 22
const POS_WIDTH = 22
const STAT_WIDTH = 34

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    minHeight: 48,
  },
  headerRow: {
    minHeight: 32,
    paddingTop: 12,
  },
  headerText: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  accent: {
    position: 'absolute',
    left: SCREEN_PADDING,
    top: 0,
    bottom: 0,
    width: 3,
  },
  separator: {
    position: 'absolute',
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  posCell: {
    width: POS_WIDTH,
    marginLeft: 12,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  posText: {
    fontWeight: 500,
  },
  crest: {
    width: CREST_SIZE,
    height: CREST_SIZE,
    marginLeft: 12,
  },
  crestSpacer: {
    width: CREST_SIZE,
    marginLeft: 12,
  },
  teamCell: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  teamCellActive: {
    fontWeight: 500,
  },
  statCell: {
    width: STAT_WIDTH,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  pointsCell: {
    fontWeight: 500,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
