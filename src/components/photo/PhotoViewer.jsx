import React, { useEffect } from 'react'
import { Modal, StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '../../hooks/useTheme'
import ZoomableImage from './ZoomableImage'

/**
 * Full-screen immersive photo viewer modal with:
 *  - Animated fade-in/out backdrop
 *  - Pinch-to-zoom + pan (via ZoomableImage)
 *  - Swipe-down-to-dismiss gesture with spring snap-back
 *  - Animated toolbar that fades in on open
 *
 * @param {{
 *   visible: boolean,
 *   uri: string,
 *   username?: string,
 *   caption?: string,
 *   onClose: () => void,
 * }} props
 */
export default function PhotoViewer({ visible, uri, username, caption, onClose }) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  const backdropOpacity = useSharedValue(0)
  const toolbarOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 220 })
      toolbarOpacity.value = withTiming(1, { duration: 280 })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 })
      toolbarOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const toolbarStyle = useAnimatedStyle(() => ({
    opacity: toolbarOpacity.value,
    transform: [{ translateY: (1 - toolbarOpacity.value) * -16 }],
  }))

  const bottomBarStyle = useAnimatedStyle(() => ({
    opacity: toolbarOpacity.value,
    transform: [{ translateY: (1 - toolbarOpacity.value) * 16 }],
  }))

  const handleDismiss = () => {
    backdropOpacity.value = withTiming(0, { duration: 200 })
    toolbarOpacity.value = withTiming(0, { duration: 160 })
    setTimeout(() => {
      onClose()
    }, 210)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/*
       * GestureHandlerRootView is REQUIRED inside Modal.
       * Modal renders into a separate native root that is outside the
       * App.js GestureHandlerRootView, so gestures would be completely
       * dead without this wrapper.
       */}
      <GestureHandlerRootView style={styles.root}>
        <StatusBar hidden={Platform.OS === 'ios'} barStyle="light-content" />

      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      <Animated.View
        style={[
          styles.toolbar,
          { paddingTop: insets.top + 8 },
          toolbarStyle,
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          id="photo-viewer-close-btn"
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {username ? (
          <Text style={styles.usernameText} numberOfLines={1}>
            {username}
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.toolbarSpacer} />
      </Animated.View>

      <View style={styles.imageContainer}>
        <ZoomableImage
          uri={uri}
          style={styles.zoomableWrapper}
          contentFit="contain"
          cachePolicy="disk"
          onSwipeDown={handleDismiss}
        />
      </View>

      {caption ? (
        <Animated.View
          style={[
            styles.captionBar,
            { paddingBottom: insets.bottom + 16 },
            bottomBarStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={styles.captionUsername}>{username} </Text>
          <Text style={styles.captionText} numberOfLines={3}>
            {caption}
          </Text>
        </Animated.View>
      ) : null}

        <Animated.View style={[styles.swipeHint, { bottom: insets.bottom + (caption ? 110 : 24) }, bottomBarStyle]} pointerEvents="none">
          <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.35)" />
          <Text style={styles.swipeHintText}>Swipe down to close</Text>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: '#000000',
    zIndex: 0,
  },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    maxWidth: 200,
    textAlign: 'center',
  },
  toolbarSpacer: {
    width: 40,
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  zoomableWrapper: {
    flex: 1,
  },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  captionUsername: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  captionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  swipeHint: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 5,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
})
