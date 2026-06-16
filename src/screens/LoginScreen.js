import React, { useState, memo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const { login } = useAuth();
  
  // Selector granular for state values from useAuthStore
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);

  const handleLogin = async () => {
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err) {
      // Error is stored in Zustand and can be displayed, but we catch here to avoid unhandled rejections
    }
  };

  const handleNavigateToRegister = () => {
    navigation.navigate('Register');
  };

  const displayedError = localError || authError;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.logoText}>AnimaVibe</Text>
        <Text style={styles.subText}>Connect with your inner vibe</Text>
      </View>

      <View style={styles.formContainer}>
        {displayedError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayedError}</Text>
          </View>
        )}

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
          autoComplete="password"
          textContentType="password"
          editable={!isLoading}
        />

        <TouchableOpacity 
          style={[styles.buttonLogin, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonRegister} 
          onPress={handleNavigateToRegister}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: '#888' }]}>
            Don't have an account? <Text style={{ color: '#fff' }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 24 },
  brandContainer: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  subText: { color: '#666', marginTop: 8, fontSize: 14 },
  formContainer: { width: '100%' },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#222' },
  disabledInput: { opacity: 0.6 },
  buttonLogin: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, height: 56, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  buttonRegister: { alignItems: 'center', marginTop: 24 },
  errorContainer: { backgroundColor: '#2c0d0d', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#5c1d1d' },
  errorText: { color: '#ff6b6b', fontSize: 14, textAlign: 'center', fontWeight: '500' }
});

export default memo(LoginScreen);