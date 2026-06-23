import React, { useRef } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Image } from 'expo-image'

const MIN_SCALE = 1
const MAX_SCALE = 5
const SWIPE_DOWN_DISTANCE = 80
const SWIPE_DOWN_VELOCITY = 700

/**
 * Pinch-to-zoom + pan + double-tap-to-zoom image component.
 * All gesture callbacks run on the UI thread via Reanimated 2.
 *
 * Gesture map:
 *  - Pinch  → zoom MIN_SCALE…MAX_SCALE; snaps to 1 when released below 1.05×
 *  - Pan (zoomed) → translate clamped to image bounds
 *  - Pan (at 1×)  → free vertical drag; fires onSwipeDown past threshold
 *  - Double-tap   → toggle 1× ↔ 2.5×
 *
 * @param {{
 *   uri: string,
 *   style?: import('react-native').StyleProp<import('react-native').ViewStyle>,
 *   contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down',
 *   cachePolicy?: string,
 *   onSwipeDown?: () => void,
 * }} props
 */
export default function ZoomableImage({
  uri,
  style,
  contentFit = 'contain',
  cachePolicy = 'disk',
  onSwipeDown,
}) {
  const onSwipeDownRef = useRef(onSwipeDown)
  onSwipeDownRef.current = onSwipeDown

  const callDismiss = () => {
    onSwipeDownRef.current?.()
  }

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTx = useSharedValue(0)
  const savedTy = useSharedValue(0)

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value
    })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE)
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 })
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 })
        savedTx.value = 0
        savedTy.value = 0
        savedScale.value = 1
      } else {
        savedScale.value = scale.value
      }
    })

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedTx.value = translateX.value
      savedTy.value = translateY.value
    })
    .onUpdate((e) => {
      if (scale.value <= 1.01) {
        translateY.value = savedTy.value + e.translationY
        translateX.value = 0
      } else {
        const maxX = (400 * (scale.value - 1)) / 2
        const maxY = (500 * (scale.value - 1)) / 2
        translateX.value = clamp(savedTx.value + e.translationX, -maxX, maxX)
        translateY.value = clamp(savedTy.value + e.translationY, -maxY, maxY)
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1.01) {
        const shouldDismiss =
          translateY.value > SWIPE_DOWN_DISTANCE ||
          e.velocityY > SWIPE_DOWN_VELOCITY
        if (shouldDismiss) {
          runOnJS(callDismiss)()
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 })
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
        }
      }
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1.01) {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 })
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 })
        savedScale.value = 1
        savedTx.value = 0
        savedTy.value = 0
      } else {
        scale.value = withSpring(2.5, { damping: 20, stiffness: 200 })
        savedScale.value = 2.5
      }
    })

  const gesture = Gesture.Simultaneous(doubleTap, pinchGesture, panGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrapper, style, animatedStyle]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy={cachePolicy}
        />
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'hidden',
  },
})
