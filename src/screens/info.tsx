import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { Image } from 'expo-image'
import * as Sharing from 'expo-sharing'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import SFSymbol from 'sf-symbols'
import type { SFSymbol as SFSymbolName } from 'sf-symbols-typescript'
import { useAuth } from '~/components/auth-context'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import { memberQuery } from '~/lib/queries'
import { useDateFormatter } from '~/lib/use-date-formatter'
import { alphaColor } from '~/theme'

const WEBSITE_URL = 'https://www.lfc.se'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appIcon = require('../../assets/icon.png') as number

export function InfoScreen() {
  const theme = useTheme()
  const navigation = useNavigation()
  const version = Constants.expoConfig?.version ?? '1.0.0'

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
      <View style={styles.header}>
        <Image
          source={appIcon}
          style={[
            styles.icon,
            { backgroundColor: theme.backgroundBaseElevated },
          ]}
          contentFit="cover"
        />
        <Text variant="headingMedium" style={{ marginTop: 16 }}>
          LFC.se
        </Text>
        <Text color="baseMuted" variant="bodySmall" style={{ marginTop: 4 }}>
          Version {version}
        </Text>
      </View>

      <AccountSection />

      <View
        style={[
          styles.section,
          styles.settingsSection,
          { borderColor: theme.borderBaseMuted },
        ]}
      >
        <Row
          icon="bell"
          label="Notiser"
          onPress={() =>
            navigation.navigate('Home', {
              screen: 'Info',
              params: { screen: 'Notifications' },
            })
          }
        />
      </View>

      <View style={[styles.section, { borderColor: theme.borderBaseMuted }]}>
        <Row
          icon="globe"
          label="Besök lfc.se"
          onPress={() => {
            void Linking.openURL(WEBSITE_URL)
          }}
        />
        <Separator />
        <Row
          icon="square.and.arrow.up"
          label="Dela appen"
          onPress={async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(WEBSITE_URL)
            } else {
              void Linking.openURL(WEBSITE_URL)
            }
          }}
        />
      </View>

      <Text color="baseMuted" variant="captionLarge" style={styles.footer}>
        En inofficiell app för Liverpool-supportrar i Sverige. Allt
        nyhetsinnehåll tillhör respektive upphovsman.
      </Text>
    </ScrollView>
  )
}

function AccountSection() {
  const theme = useTheme()
  const navigation = useNavigation()
  const { session, signOut } = useAuth()
  const dateFormatter = useDateFormatter('sv', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const { data: member } = useQuery(memberQuery(session?.token))

  if (!session) {
    return (
      <View
        style={[
          styles.section,
          styles.accountSection,
          { borderColor: theme.borderBaseMuted },
        ]}
      >
        <Row
          icon="person.crop.circle"
          label="Logga in"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    )
  }

  const handleSignOut = () => {
    Alert.alert('Logga ut', 'Vill du logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logga ut',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ])
  }

  return (
    <View
      style={[
        styles.section,
        styles.accountSection,
        { borderColor: theme.borderBaseMuted },
      ]}
    >
      <View style={styles.account}>
        {member?.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: theme.backgroundBaseElevated },
            ]}
          >
            <SFSymbol
              name="person.fill"
              weight="regular"
              scale="small"
              colors={[theme.foregroundBaseMuted]}
              size={22}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="headingXSmall">
            {member?.name ?? session.username}
          </Text>
          <Text color="baseMuted" variant="bodySmall">
            @{member?.username ?? session.username}
          </Text>
        </View>
      </View>

      {member?.expirationDate ? (
        <>
          <Separator />
          <View style={styles.membership}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Medlemskap</Text>
              <Text
                color="baseMuted"
                variant="bodySmall"
                style={{ marginTop: 2 }}
              >
                Giltigt till {dateFormatter.format(member.expirationDate)}
              </Text>
            </View>
            {member.daysLeft <= 30 ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: alphaColor(theme.foregroundAction, 0.12) },
                ]}
              >
                <Text
                  variant="captionMedium"
                  style={{ color: theme.foregroundAction }}
                >
                  {member.daysLeft} dagar kvar
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Separator />
      <Row
        icon="rectangle.portrait.and.arrow.right"
        label="Logga ut"
        onPress={handleSignOut}
        destructive
      />
    </View>
  )
}

interface RowProps {
  icon: SFSymbolName
  label: string
  onPress: () => void
  actionLabel?: string
  destructive?: boolean
}

function Row({ icon, label, onPress, actionLabel, destructive }: RowProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.backgroundBaseElevated },
      ]}
    >
      <SFSymbol
        name={icon}
        weight="regular"
        scale="small"
        colors={[theme.foregroundAction]}
        size={20}
      />
      <Text
        variant="bodyMedium"
        color={destructive ? 'action' : 'base'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {actionLabel ? (
        <Text variant="bodyMedium" style={{ color: theme.foregroundAction }}>
          {actionLabel}
        </Text>
      ) : destructive ? null : (
        <SFSymbol
          name="chevron.right"
          weight="semibold"
          scale="small"
          colors={[theme.foregroundBaseMuted]}
          size={14}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
  },
  section: {
    marginHorizontal: 17,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  accountSection: {
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 16,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  membership: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 17,
    paddingTop: 24,
    textAlign: 'center',
  },
})
