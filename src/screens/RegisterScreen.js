import React, { useState, memo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';

function RegisterScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const { register } = useAuth();
  
  // Selector granular for state values from useAuthStore
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);

  const handleRegister = async () => {
    setLocalError(null);

    // Client-side validations
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      await register(email.trim(), password, displayName.trim());
    } catch (err) {
      // Error is caught here, but Zustand handles storing it globally
    }
  };

  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };

  const displayedError = localError || authError;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.logoText}>Create Account</Text>
        <Text style={styles.subText}>Join the AnimaVibe community</Text>
      </View>

      <View style={styles.formContainer}>
        {displayedError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayedError}</Text>
          </View>
        )}

        <TextInput
          style={[styles.input, isLoading && styles.disabledInput]}
          placeholder="Full name"
          placeholderTextColor="#555"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          editable={!isLoading}
        />
        <TextInput
          style={[styles.input, isLoading && styles.disabledInput]}
          placeholder="Email address"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!isLoading}
        />
        <TextInput
          style={[styles.input, isLoading && styles.disabledInput]}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          editable={!isLoading}
        />
        <TextInput
          style={[styles.input, isLoading && styles.disabledInput]}
          placeholder="Confirm password"
          placeholderTextColor="#555"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          editable={!isLoading}
        />

        <TouchableOpacity 
          style={[styles.buttonRegister, isLoading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonLogin} 
          onPress={handleNavigateToLogin}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: '#888' }]}>
            Already have an account? <Text style={{ color: '#fff' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 24 },
  brandContainer: { alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  subText: { color: '#666', marginTop: 8, fontSize: 14 },
  formContainer: { width: '100%' },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#222' },
  disabledInput: { opacity: 0.6 },
  buttonRegister: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, height: 56, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  buttonLogin: { alignItems: 'center', marginTop: 24 },
  errorContainer: { backgroundColor: '#2c0d0d', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#5c1d1d' },
  errorText: { color: '#ff6b6b', fontSize: 14, textAlign: 'center', fontWeight: '500' }
});

export default memo(RegisterScreen);
