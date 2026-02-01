import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useScrollToTop } from '@react-navigation/native'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Suspense, useRef } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Standing } from '~/api'
import { AnimatedHeaderBackground } from '~/components/animated-header-background'
import { ScrollProvider, useScrollContext } from '~/components/scroll-context'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { standingsQuery } from '~/lib/queries'

export function StandingsScreen() {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground />
      <Suspense fallback={null}>
        <StandingsTable />
      </Suspense>
    </ScrollProvider>
  )
}

function StandingsTable() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { onScroll } = useScrollContext()

  const { data } = useSuspenseQuery(standingsQuery)

  const ref = useRef<FlatList<Standing>>(null)
  useScrollToTop(ref)

  return (
    <FlatList
      ref={ref}
      data={data}
      keyExtractor={(item) => item.team}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: tabBarHeight - insets.bottom }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - insets.bottom }}
      ListHeaderComponent={TableHeader}
      renderItem={({ item }) => <TableRow standing={item} />}
      getItemLayout={(_, index) => ({
        index,
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index + HEADER_HEIGHT,
      })}
      ItemSeparatorComponent={Separator}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  )
}

function TableHeader() {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.row,
        styles.header,
        { backgroundColor: theme.backgroundBaseElevated },
      ]}
    >
      <View style={styles.positionCol}>
        <Text variant="captionLarge" color="baseMuted">
          #
        </Text>
      </View>
      <View style={styles.teamCol}>
        <Text variant="captionLarge" color="baseMuted">
          Lag
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text variant="captionLarge" color="baseMuted">
          S
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text variant="captionLarge" color="baseMuted">
          V
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text variant="captionLarge" color="baseMuted">
          O
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text variant="captionLarge" color="baseMuted">
          F
        </Text>
      </View>
      <View style={styles.goalDiffCol}>
        <Text variant="captionLarge" color="baseMuted">
          MS
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Text variant="captionLarge" color="baseMuted">
          P
        </Text>
      </View>
    </View>
  )
}

interface TableRowProps {
  standing: Standing
}

function TableRow({ standing }: TableRowProps) {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.row,
        standing.isLiverpool && {
          backgroundColor: theme.backgroundBaseElevated,
        },
      ]}
    >
      <View style={styles.positionCol}>
        <Text
          variant="bodySmall"
          style={[
            styles.tabularNums,
            standing.isLiverpool && styles.highlight,
          ]}
        >
          {standing.position}
        </Text>
      </View>
      <View style={styles.teamCol}>
        <Image
          source={standing.imageUrl}
          style={styles.teamLogo}
          contentFit="contain"
        />
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[standing.isLiverpool && styles.highlight]}
        >
          {standing.team}
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text
          variant="bodySmall"
          color="baseMuted"
          style={styles.tabularNums}
        >
          {standing.played}
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text
          variant="bodySmall"
          color="baseMuted"
          style={styles.tabularNums}
        >
          {standing.won}
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text
          variant="bodySmall"
          color="baseMuted"
          style={styles.tabularNums}
        >
          {standing.draw}
        </Text>
      </View>
      <View style={styles.statCol}>
        <Text
          variant="bodySmall"
          color="baseMuted"
          style={styles.tabularNums}
        >
          {standing.lost}
        </Text>
      </View>
      <View style={styles.goalDiffCol}>
        <Text
          variant="bodySmall"
          color="baseMuted"
          style={styles.tabularNums}
        >
          {standing.goalDifference > 0 ? '+' : ''}
          {standing.goalDifference}
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Text
          variant="bodySmall"
          style={[
            styles.tabularNums,
            styles.points,
            standing.isLiverpool && styles.highlight,
          ]}
        >
          {standing.points}
        </Text>
      </View>
    </View>
  )
}

const ROW_HEIGHT = 48
const HEADER_HEIGHT = 40

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: ROW_HEIGHT,
  },
  header: {
    height: HEADER_HEIGHT,
  },
  positionCol: {
    width: 28,
  },
  teamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 20,
    height: 20,
  },
  statCol: {
    width: 28,
    alignItems: 'center',
  },
  goalDiffCol: {
    width: 36,
    alignItems: 'center',
  },
  pointsCol: {
    width: 32,
    alignItems: 'flex-end',
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  points: {
    fontWeight: '600',
  },
  highlight: {
    fontWeight: '600',
  },
})
