import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useTheme';

export default function LoginScreen({ navigation }) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isChecked, setIsChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth()

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email')
      return
    }
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password')
      return
    }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      Alert.alert('Success', 'Logged in successfully!')
      setEmail('')
      setPassword('')
    } catch (error) {
      Alert.alert('Login Error', error.message || 'Failed to log in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle()
    if (!result.success) {
      Alert.alert('Google Sign-In Failed', result.error || 'An error occurred during Google sign in')
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword')

    React.useEffect(() => {
      if (googleError) {
        Alert.alert('Google Sign-In Error', googleError)
      }
    }, [googleError])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Bagian Atas */}
        <View style={styles.logoBox}>
          <MaterialIcons
            name="bubble-chart"
            size={24}
            color={colors.brand}
          />
        </View>
        <Text style={styles.title}>Social App</Text>
        <Text style={styles.subtitle}>Log in to your account</Text>

        {/* Form Input */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#777777"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#777777"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          {/* Remember Me Checkbox (Custom UI) */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            activeOpacity={0.8}
            onPress={() => setIsChecked(!isChecked)}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.mainButtonText}>Log in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider OR */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Tombol Social Media */}
        <TouchableOpacity
          style={[styles.outlineButton, googleLoading && styles.outlineButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.outlineButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Continue with SSO</Text>
        </TouchableOpacity>

        {/* Tombol Pindah ke Register */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40
  },
  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: colors.surfaceHigh,
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 14
  },
  formContainer: {
    marginBottom: 24
  },
  label: {
    color: colors.text,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500'
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    color: colors.text,
    marginBottom: 16,
    fontSize: 14
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  forgotText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500'
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  checkboxLabel: {
    color: colors.textSecondary,
    fontSize: 14
  },
  mainButton: {
    backgroundColor: colors.text,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  mainButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.7
  },
  mainButtonText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border
  },
  orText: {
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontSize: 12
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.surface
  },
  outlineButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14
  },
  outlineButtonDisabled: {
    opacity: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14
  },
  footerLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold'
  },
})