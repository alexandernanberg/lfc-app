import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import SFSymbol from 'sf-symbols'
import { Separator } from '~/components/separator'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'
import {
  getNewPostNotificationsEnabled,
  hasNotificationPermission,
  setNewPostNotificationsEnabled,
} from '~/lib/notifications'

export function NotificationSettingsScreen() {
  const theme = useTheme()
  const [enabled, setEnabled] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(true)

  // Re-read on focus so returning from the system settings (e.g. after granting
  // permission) reflects the current state.
  useFocusEffect(
    useCallback(() => {
      let active = true
      void Promise.all([
        getNewPostNotificationsEnabled(),
        hasNotificationPermission(),
      ]).then(([pref, granted]) => {
        if (!active) {
          return
        }
        setEnabled(pref)
        setPermissionGranted(granted)
      })
      return () => {
        active = false
      }
    }, []),
  )

  const onToggle = async (value: boolean) => {
    setEnabled(value)
    // When enabling, this prompts for permission and returns whether it was
    // granted; reflect a denial so the warning below can guide the user.
    const active = await setNewPostNotificationsEnabled(value)
    setPermissionGranted(value ? active : true)
  }

  const showPermissionWarning = enabled && !permissionGranted

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.backgroundGrouped }}
    >
      <View
        style={[
          styles.section,
          { backgroundColor: theme.backgroundGroupedElevated },
        ]}
      >
        <View style={styles.row}>
          <SFSymbol
            name="newspaper"
            weight="regular"
            scale="small"
            colors={[theme.foregroundAction]}
            size={20}
          />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            Nya artiklar
          </Text>
          <Switch
            value={enabled}
            onValueChange={(value) => void onToggle(value)}
            trackColor={{ true: theme.foregroundAction }}
          />
        </View>
      </View>

      <Text color="baseMuted" variant="captionLarge" style={styles.caption}>
        Få en notis när en ny artikel publiceras på lfc.se. Notiserna hämtas i
        bakgrunden och kan fördröjas av systemet.
      </Text>

      {showPermissionWarning ? (
        <View
          style={[
            styles.section,
            styles.warning,
            { backgroundColor: theme.backgroundGroupedElevated },
          ]}
        >
          <Text variant="bodySmall" style={styles.warningText}>
            Notiser är avstängda i systeminställningarna. Slå på dem för att ta
            emot notiser.
          </Text>
          <Separator />
          <Pressable
            onPress={() => void Linking.openSettings()}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && { backgroundColor: theme.backgroundHighlighted },
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{ color: theme.foregroundAction }}
            >
              Öppna systeminställningar
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 17,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  caption: {
    paddingHorizontal: 17,
    paddingTop: 8,
    paddingBottom: 16,
  },
  warning: {
    marginTop: 8,
  },
  warningText: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  settingsButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
})
