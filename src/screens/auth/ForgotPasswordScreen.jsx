import React from 'react'
import { StyleSheet, Text, SafeAreaView } from 'react-native'
import { useThemeColors } from '../../hooks/useTheme'

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Halaman Lupa Password (WIP)</Text>
    </SafeAreaView>
  )
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  }
})