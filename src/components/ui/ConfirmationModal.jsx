import React from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '../../hooks/useTheme'

/**
 * Reusable confirmation dialog for destructive or state-changing actions.
 * @param {{ visible: boolean, title: string, message: string, confirmLabel?: string, cancelLabel?: string, destructive?: boolean, isLoading?: boolean, iconName?: string, onCancel: Function, onConfirm: Function }} props
 */
export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
  iconName = 'alert-circle-outline',
  onCancel,
  onConfirm,
}) {
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: visible ? 180 : 140 })
  }, [progress, visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.72,
  }))

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 16 },
      { scale: 0.96 + (progress.value * 0.04) },
    ],
  }))

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={isLoading ? undefined : onCancel} />
        </Animated.View>

        <Animated.View style={[styles.card, cardStyle]}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
            <Ionicons
              name={iconName}
              size={24}
              color={destructive ? colors.danger : colors.brand}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, destructive && styles.confirmButtonDanger]}
              onPress={onConfirm}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const getStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.72,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    marginBottom: 14,
  },
  iconWrapDanger: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  button: {
    minWidth: 96,
    minHeight: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  confirmButton: {
    backgroundColor: colors.brand,
  },
  confirmButtonDanger: {
    backgroundColor: colors.danger,
  },
  cancelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
})
