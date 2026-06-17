import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name')
      return
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email')
      return
    }
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter a password')
      return
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      await register(email.trim(), password, fullName.trim())
      Alert.alert('Success', 'Account created successfully!')
      setFullName('')
      setEmail('')
      setPassword('')
    } catch (error) {
      Alert.alert('Registration Error', error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Bagian Atas */}
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>Join Social App today</Text>

        {/* Form Input */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your full name" 
            placeholderTextColor="#777777"
            value={fullName}
            onChangeText={setFullName}
            editable={!isLoading}
          />

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
          
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Create a password" 
            placeholderTextColor="#777777" 
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
          
          <TouchableOpacity 
            style={[styles.mainButton, isLoading && styles.mainButtonDisabled]} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.mainButtonText}>Sign up</Text>
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
        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Sign up with Google</Text>
        </TouchableOpacity>

        {/* Tombol Pindah ke Login */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Log in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 14
  },
  formContainer: {
    marginBottom: 24
  },
  label: {
    color: '#ffffff',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500'
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 14,
    color: '#ffffff',
    marginBottom: 16,
    fontSize: 14
  },
  mainButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  mainButtonDisabled: {
    backgroundColor: '#888888',
    opacity: 0.7
  },
  mainButtonText: {
    color: '#000000',
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
    backgroundColor: '#333333'
  },
  orText: {
    color: '#777777',
    marginHorizontal: 16,
    fontSize: 12
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  outlineButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  footerText: {
    color: '#aaaaaa',
    fontSize: 14
  },
  footerLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold'
  }
})