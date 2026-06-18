import { useScrollToTop } from '@react-navigation/native'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useRef } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Standing } from '~/api'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { TAB_BAR_HEIGHT } from '~/lib/layout'
import { standingQuery } from '~/lib/queries'
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
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.heading}>
        <Text variant="headingSmall">Premier League</Text>
      </View>

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
      <View style={styles.posCell}>
        <Text
          variant="captionSmall"
          color="baseMuted"
          style={styles.headerText}
        >
          #
        </Text>
      </View>
      <Text
        variant="captionSmall"
        color="baseMuted"
        style={[styles.teamCell, styles.headerText]}
      >
        Lag
      </Text>
      <HeaderStat label="S" />
      <HeaderStat label="V" />
      <HeaderStat label="O" />
      <HeaderStat label="F" />
      <HeaderStat label="MS" wide />
      <HeaderStat label="P" points />
    </View>
  )
}

function HeaderStat({
  label,
  wide,
  points,
}: {
  label: string
  wide?: boolean
  points?: boolean
}) {
  return (
    <Text
      variant="captionSmall"
      color="baseMuted"
      style={[
        styles.statCell,
        wide && styles.statCellWide,
        points && styles.pointsCell,
        styles.headerText,
      ]}
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
        !isLast && {
          borderBottomColor: theme.borderBaseMuted,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.posCell}>
        <View
          style={[styles.accent, { backgroundColor: accent ?? 'transparent' }]}
        />
        <Text variant="bodySmall" style={styles.posText}>
          {row.position}
        </Text>
      </View>

      <Text
        variant="bodySmall"
        numberOfLines={1}
        style={[styles.teamCell, row.isLiverpool && styles.teamCellActive]}
      >
        {row.team}
      </Text>

      <Stat value={row.played} />
      <Stat value={row.won} />
      <Stat value={row.draw} />
      <Stat value={row.lost} />
      <Stat value={goalDifference} wide />
      <Stat value={row.points} points />
    </View>
  )
}

function Stat({
  value,
  wide,
  points,
}: {
  value: number | string
  wide?: boolean
  points?: boolean
}) {
  return (
    <Text
      variant="bodySmall"
      color={points ? 'base' : 'baseMuted'}
      style={[
        styles.statCell,
        wide && styles.statCellWide,
        points && styles.pointsCell,
      ]}
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

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    minHeight: 44,
  },
  headerRow: {
    minHeight: 32,
  },
  headerText: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  posCell: {
    width: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  posText: {
    fontVariant: ['tabular-nums'],
  },
  teamCell: {
    flex: 1,
    marginRight: 8,
  },
  teamCellActive: {
    fontWeight: 600,
  },
  statCell: {
    width: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  statCellWide: {
    width: 34,
  },
  pointsCell: {
    width: 30,
    fontWeight: 700,
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
