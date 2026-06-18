import { useNavigation } from '@react-navigation/native'
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

const WEBSITE_URL = 'https://www.lfc.se'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appIcon = require('../../assets/icon.png') as number

export function InfoScreen() {
  const theme = useTheme()
  const navigation = useNavigation()
  const { session, signOut } = useAuth()
  const version = Constants.expoConfig?.version ?? '1.0.0'

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

      <View
        style={[
          styles.section,
          styles.accountSection,
          { borderColor: theme.borderBaseMuted },
        ]}
      >
        {session ? (
          <Row
            icon="person.crop.circle"
            label={`Inloggad som ${session.username}`}
            onPress={handleSignOut}
            actionLabel="Logga ut"
          />
        ) : (
          <Row
            icon="person.crop.circle"
            label="Logga in"
            onPress={() => navigation.navigate('Login')}
          />
        )}
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

interface RowProps {
  icon: SFSymbolName
  label: string
  onPress: () => void
  actionLabel?: string
}

function Row({ icon, label, onPress, actionLabel }: RowProps) {
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
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </Text>
      {actionLabel ? (
        <Text variant="bodyMedium" style={{ color: theme.foregroundAction }}>
          {actionLabel}
        </Text>
      ) : (
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
