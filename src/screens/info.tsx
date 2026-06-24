import {
  Button,
  Form,
  Host,
  HStack,
  Image,
  LabeledContent,
  Section,
  Text,
  VStack,
} from '@expo/ui/swift-ui'
import {
  clipShape,
  foregroundStyle,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { Asset } from 'expo-asset'
import Constants from 'expo-constants'
import { Image as ExpoImage } from 'expo-image'
import * as Sharing from 'expo-sharing'
import { useEffect, useState } from 'react'
import { Alert, Linking } from 'react-native'
import { useAuth } from '~/components/auth-context'
import { useTheme } from '~/components/theme-context'
import { memberQuery } from '~/lib/queries'
import { useDateFormatter } from '~/lib/use-date-formatter'

const WEBSITE_URL = 'https://www.lfc.se'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appIcon = require('../../assets/icon.png') as number

// SwiftUI's `Image` only renders SF Symbols or local file URIs, so bundled and
// remote images have to be resolved to a `file://` path before they can be
// shown. These hooks do that, falling back to `null` (→ an SF Symbol) until the
// file is available.
function useAssetUri(module: number): string | null {
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Asset.fromModule(module)
      .downloadAsync()
      .then((asset) => {
        if (active) {
          setUri(asset.localUri ?? asset.uri)
        }
      })
    return () => {
      active = false
    }
  }, [module])

  return uri
}

function useCachedImageUri(url: string | null | undefined): string | null {
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!url) {
      setUri(null)
      return
    }

    const toFileUri = (path: string | null) =>
      path ? (path.startsWith('file://') ? path : `file://${path}`) : null

    void ExpoImage.getCachePathAsync(url)
      .then(async (path) => {
        if (path) {
          return path
        }
        // Not cached yet — pull it to disk, then resolve the file path.
        await ExpoImage.prefetch(url, 'disk')
        return ExpoImage.getCachePathAsync(url)
      })
      .then((path) => {
        if (active) {
          setUri(toFileUri(path))
        }
      })
      .catch(() => {
        if (active) {
          setUri(null)
        }
      })

    return () => {
      active = false
    }
  }, [url])

  return uri
}

export function InfoScreen() {
  const theme = useTheme()
  const navigation = useNavigation()
  const version = Constants.expoConfig?.version ?? '1.0.0'
  const appIconUri = useAssetUri(appIcon)

  return (
    <Host
      style={{ flex: 1 }}
      useViewportSizeMeasurement
      modifiers={[tint(theme.foregroundAction)]}
    >
      <Form>
        <Section>
          <HStack spacing={12}>
            {appIconUri ? (
              <Image
                uiImage={appIconUri}
                modifiers={[
                  frame({ width: 56, height: 56 }),
                  clipShape('roundedRectangle', 13),
                ]}
              />
            ) : null}
            <VStack alignment="leading" spacing={2}>
              <Text>LFC.se</Text>
              <Text modifiers={[foregroundStyle(theme.foregroundBaseMuted)]}>
                Version {version}
              </Text>
            </VStack>
          </HStack>
        </Section>

        <AccountSection />

        <Section>
          <Button
            systemImage="bell"
            label="Notiser"
            onPress={() =>
              navigation.navigate('Home', {
                screen: 'Info',
                params: { screen: 'Notifications' },
              })
            }
          />
        </Section>

        <Section
          footer={
            <Text>
              En inofficiell app för Liverpool-supportrar i Sverige. Allt
              nyhetsinnehåll tillhör respektive upphovsman.
            </Text>
          }
        >
          <Button
            systemImage="globe"
            label="Besök lfc.se"
            onPress={() => void Linking.openURL(WEBSITE_URL)}
          />
          <Button
            systemImage="square.and.arrow.up"
            label="Dela appen"
            onPress={async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(WEBSITE_URL)
              } else {
                void Linking.openURL(WEBSITE_URL)
              }
            }}
          />
        </Section>
      </Form>
    </Host>
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
  const avatarUri = useCachedImageUri(member?.avatarUrl)

  if (!session) {
    return (
      <Section>
        <Button
          systemImage="person.crop.circle"
          label="Logga in"
          onPress={() => navigation.navigate('Login')}
        />
      </Section>
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
    <Section>
      <HStack spacing={12}>
        {avatarUri ? (
          <Image
            uiImage={avatarUri}
            modifiers={[frame({ width: 48, height: 48 }), clipShape('circle')]}
          />
        ) : (
          <Image
            systemName="person.crop.circle.fill"
            size={48}
            color={theme.foregroundBaseMuted}
          />
        )}
        <VStack alignment="leading" spacing={2}>
          <Text>{member?.name ?? session.username}</Text>
          <Text modifiers={[foregroundStyle(theme.foregroundBaseMuted)]}>
            @{member?.username ?? session.username}
          </Text>
        </VStack>
      </HStack>

      {member?.expirationDate ? (
        <LabeledContent label="Medlemskap">
          <Text>
            {member.daysLeft <= 30
              ? `${member.daysLeft} dagar kvar`
              : `Giltigt till ${dateFormatter.format(member.expirationDate)}`}
          </Text>
        </LabeledContent>
      ) : null}

      <Button
        role="destructive"
        systemImage="rectangle.portrait.and.arrow.right"
        label="Logga ut"
        onPress={handleSignOut}
      />
    </Section>
  )
}
