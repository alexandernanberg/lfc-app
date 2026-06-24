import { Button, Form, Host, Section, Text, Toggle } from '@expo/ui/swift-ui'
import { tint } from '@expo/ui/swift-ui/modifiers'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Linking } from 'react-native'
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
    <Host
      style={{ flex: 1 }}
      useViewportSizeMeasurement
      modifiers={[tint(theme.foregroundAction)]}
    >
      <Form>
        <Section
          footer={
            <Text>
              Få en notis när en ny artikel publiceras på lfc.se. Notiserna
              hämtas i bakgrunden och kan fördröjas av systemet.
            </Text>
          }
        >
          <Toggle
            label="Nya artiklar"
            isOn={enabled}
            onIsOnChange={(value) => void onToggle(value)}
          />
        </Section>

        {showPermissionWarning ? (
          <Section
            footer={
              <Text>
                Notiser är avstängda i systeminställningarna. Slå på dem för att
                ta emot notiser.
              </Text>
            }
          >
            <Button
              systemImage="gear"
              label="Öppna systeminställningar"
              onPress={() => void Linking.openSettings()}
            />
          </Section>
        ) : null}
      </Form>
    </Host>
  )
}
