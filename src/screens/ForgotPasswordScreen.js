import React from 'react'
import { StyleSheet, Text, View, SafeAreaView } from 'react-native'

export default function ForgotPasswordScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Halaman Lupa Password (WIP)</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  text: { 
    color: '#ffffff', 
    fontSize: 16,
    fontWeight: '600'
  }
})