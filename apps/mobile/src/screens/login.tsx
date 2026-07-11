import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { AuthError } from '~/api'
import { useAuth } from '~/components/auth-context'
import { Text } from '~/components/text'
import { useTheme } from '~/components/theme-context'

export function LoginScreen() {
  const theme = useTheme()
  const navigation = useNavigation()
  const { signIn } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = username.trim() !== '' && password !== '' && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await signIn(username.trim(), password)
      navigation.goBack()
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Något gick fel. Försök igen senare.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headingMedium">Logga in</Text>
        <Text color="baseMuted" variant="bodySmall" style={{ marginTop: 4 }}>
          Logga in med ditt konto på lfc.se för att kommentera.
        </Text>

        <View style={styles.fields}>
          <View>
            <Text variant="captionLarge" color="baseMuted" style={styles.label}>
              Användarnamn
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
              placeholder="Användarnamn"
              placeholderTextColor={theme.foregroundBaseMuted}
              style={[
                styles.input,
                {
                  color: theme.foregroundBase,
                  backgroundColor: theme.backgroundBaseElevated,
                  borderColor: theme.borderBaseMuted,
                },
              ]}
            />
          </View>

          <View>
            <Text variant="captionLarge" color="baseMuted" style={styles.label}>
              Lösenord
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              secureTextEntry
              returnKeyType="go"
              editable={!submitting}
              onSubmitEditing={() => void handleSubmit()}
              placeholder="Lösenord"
              placeholderTextColor={theme.foregroundBaseMuted}
              style={[
                styles.input,
                {
                  color: theme.foregroundBase,
                  backgroundColor: theme.backgroundBaseElevated,
                  borderColor: theme.borderBaseMuted,
                },
              ]}
            />
          </View>

          {error != null ? (
            <Text variant="bodySmall" style={{ color: theme.foregroundAction }}>
              {error}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.foregroundAction,
              opacity: !canSubmit ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.backgroundBase} />
          ) : (
            <Text
              variant="bodyMedium"
              style={[styles.buttonText, { color: theme.backgroundBase }]}
            >
              Logga in
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 17,
    gap: 24,
  },
  fields: {
    gap: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    fontSize: 17,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 600,
  },
})
