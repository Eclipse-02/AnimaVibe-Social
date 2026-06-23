import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal, Pressable, Share, StyleSheet, View, Text,
  TouchableOpacity, Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withTiming, Easing, runOnJS,
  useAnimatedStyle, withSpring, cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { getTimeAgo } from '../../lib/firestore/posts';
import { repostStory } from '../../lib/firestore/stories';
import { useAuthStore } from '../../store/authStore';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useThemeColors } from '../../hooks/useTheme';
import ZoomableImage from '../../components/photo/ZoomableImage';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBarItem — static (no animation; archived stories don't auto-advance)
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBarItem({ index, currentIndex, colors }) {
  return (
    <View
      style={[
        { height: 4, borderRadius: 2, flex: 1 },
        {
          backgroundColor:
            index < currentIndex
              ? colors.text
              : index === currentIndex
              ? 'rgba(255,255,255,0.8)'
              : 'rgba(255,255,255,0.3)',
        },
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArchivedStoryDeck — view-only story deck with Repost in place of Archive
// ─────────────────────────────────────────────────────────────────────────────
function ArchivedStoryDeck({ stories, navigation, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [isActionLoading, setActionLoading] = useState(false);

  const menuProgress = useSharedValue(0);
  const swipeTranslateY = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);

  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    menuProgress.value = withTiming(isMenuOpen ? 1 : 0, { duration: 160 });
  }, [isMenuOpen]);

  // Reset swipe values on story change
  useEffect(() => {
    swipeTranslateY.value = 0;
    swipeOpacity.value = 1;
  }, [currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };

  // ── Swipe-up-to-dismiss ────────────────────────────────────────
  const SWIPE_UP_DISTANCE = -60;
  const SWIPE_UP_VELOCITY = -600;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const callClose = () => onCloseRef.current?.();

  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationY < 0) {
        swipeTranslateY.value = e.translationY;
        swipeOpacity.value = Math.max(0, 1 + (e.translationY / (height * 0.35)));
      }
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY < SWIPE_UP_DISTANCE ||
        e.velocityY < SWIPE_UP_VELOCITY;
      if (shouldDismiss) {
        swipeTranslateY.value = withTiming(-height, { duration: 220 });
        swipeOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(callClose)();
      } else {
        swipeTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        swipeOpacity.value = withSpring(1, { damping: 20, stiffness: 200 });
      }
    });

  // ── Repost action ──────────────────────────────────────────────
  const handleRepost = () => {
    setMenuOpen(false);
    if (!user?.uid) return;

    setConfirmation({
      title: 'Repost Story',
      message: 'Share this story again with your followers? A new 24-hour story will be created.',
      confirmLabel: 'Repost',
      destructive: false,
      iconName: 'repeat-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await repostStory(currentStory.id, user.uid);
          setConfirmation(null);
          onClose();
        } catch (e) {
          console.error('Failed to repost story:', e);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleShare = async () => {
    setMenuOpen(false);
    try {
      await Share.share({ message: `Check out this story on AnimaVibe.` });
    } catch (error) {
      console.error('Failed to share story:', error);
    }
  };

  // ── Animated styles ────────────────────────────────────────────
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -8 },
      { scale: 0.96 + (menuProgress.value * 0.04) },
    ],
  }));

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeTranslateY.value }],
    opacity: swipeOpacity.value,
  }));

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  const displayAvatar = userProfile?.photoURL || currentStory.userPhoto;
  const displayName =
    userProfile?.displayName || userProfile?.username || currentStory.username;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <GestureDetector gesture={swipeUpGesture}>
      <Animated.View style={[styles.deckContainer, swipeAnimatedStyle]}>
        {/* Progress dots (static, no timer) */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <ProgressBarItem index={index} currentIndex={currentIndex} colors={colors} />
            </View>
          ))}
        </View>

        {/* Story image with pinch-to-zoom */}
        <View style={StyleSheet.absoluteFill}>
          <ZoomableImage
            uri={currentStory.mediaUrl}
            contentFit="cover"
            onSwipeDown={onClose}
            horizontalPassthrough
          />
        </View>

        {/* Left / Right tap zones */}
        <View style={styles.touchAreaContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.touchArea} onPress={handlePrev} activeOpacity={1} />
          <TouchableOpacity style={styles.touchArea} onPress={handleNext} activeOpacity={1} />
        </View>

        {/* Overlay */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Header */}
          <View style={styles.header} pointerEvents="box-none">
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.username}>{currentStory.username}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(currentStory.createdAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={styles.menuBtn}
              pointerEvents="auto"
            >
              <Ionicons name="ellipsis-horizontal" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* "Archive" badge */}
          <View style={styles.archiveBadge} pointerEvents="none">
            <Ionicons name="archive-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.archiveBadgeText}>Archived story</Text>
          </View>

          {/* Caption */}
          {currentStory.caption ? (
            <View style={styles.footerContainer} pointerEvents="none">
              <View style={styles.captionBubbleContainer}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.captionAvatar} />
                ) : (
                  <View style={[styles.captionAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitialSm}>{initial}</Text>
                  </View>
                )}
                <View style={styles.captionBubble}>
                  <Text style={styles.captionText}>{currentStory.caption}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Dropdown menu */}
        <Modal
          transparent
          visible={isMenuOpen}
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <Animated.View style={[styles.dropdownMenu, menuAnimatedStyle]}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleRepost}>
                <Ionicons name="repeat-outline" size={18} color={colors.text} />
                <Text style={styles.dropdownText}>Repost</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color={colors.text} />
                <Text style={styles.dropdownText}>Share</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Confirmation modal */}
        <ConfirmationModal
          visible={Boolean(confirmation)}
          title={confirmation?.title || ''}
          message={confirmation?.message || ''}
          confirmLabel={confirmation?.confirmLabel}
          destructive={confirmation?.destructive}
          iconName={confirmation?.iconName}
          isLoading={isActionLoading}
          onCancel={() => { if (!isActionLoading) setConfirmation(null); }}
          onConfirm={() => confirmation?.onConfirm?.()}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArchivedStoryScreen — root screen
// Route param: stories (Array<story>) — all archived stories for the user,
//              startIndex (number) — which story to open first.
// ─────────────────────────────────────────────────────────────────────────────
export default function ArchivedStoryScreen({ navigation, route }) {
  const stories = route.params?.stories ?? [];
  const startIndex = route.params?.startIndex ?? 0;
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Slice so we start at the tapped story and can advance forward
  const storySlice = stories.slice(startIndex);

  if (storySlice.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Story not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.brand }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      <ArchivedStoryDeck
        stories={storySlice}
        navigation={navigation}
        onClose={() => navigation.goBack()}
      />
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  deckContainer: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  touchAreaContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  touchArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarInitialSm: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  username: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 1,
  },
  menuBtn: {
    padding: 4,
  },
  archiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: 115,
    alignSelf: 'center',
  },
  archiveBadgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 98,
    right: 28,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  captionBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  captionAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  captionBubble: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: width * 0.6,
  },
  captionText: {
    color: '#111111',
    fontSize: 14,
  },
});
