import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen({ navigation }) {
  const [isChecked, setIsChecked] = useState(false)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Bagian Atas */}
        <View style={styles.logoBox} />
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
          />
          
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your password" 
            placeholderTextColor="#777777" 
            secureTextEntry 
          />

          {/* Remember Me Checkbox (Custom UI) */}
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            activeOpacity={0.8}
            onPress={() => setIsChecked(!isChecked)}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mainButton}>
            <Text style={styles.mainButtonText}>Log in</Text>
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
          <Text style={styles.outlineButtonText}>Continue with Google</Text>
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
  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 12
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
    borderColor: '#555555',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111'
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
    color: '#aaaaaa',
    fontSize: 14
  },
  mainButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
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