import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal, Pressable, Share, StyleSheet, View, Text,
  TouchableOpacity, Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Animated, {
  useSharedValue, withTiming, Easing, runOnJS,
  useAnimatedStyle, withSpring, cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import PagerView from 'react-native-pager-view';
import { archiveStory, getActiveStories, toggleLikeStory } from '../../lib/firestore/stories';
import { getTimeAgo } from '../../lib/firestore/posts';
import { useAuthStore } from '../../store/authStore';
import StoryCommentsModal from '../../components/StoryCommentsModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useThemeColors } from '../../hooks/useTheme';
import ZoomableImage from '../../components/photo/ZoomableImage';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBarItem — animated segment for each story in a deck
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBarItem({ index, currentIndex, progress, colors }) {
  const animatedStyle = useAnimatedStyle(() => {
    let widthVal = '0%';
    if (index < currentIndex) widthVal = '100%';
    else if (index === currentIndex) widthVal = (progress.value * 100) + '%';
    return { width: widthVal };
  });
  return <Animated.View style={[{ height: 4, backgroundColor: colors.text, borderRadius: 2 }, animatedStyle]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryDeck — renders one user's story sequence with gestures
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{
 *   stories: Object[],
 *   isActive: boolean,
 *   navigation: Object,
 *   onNextUser: Function,
 *   onPrevUser: Function,
 *   onClose: Function,
 * }} props
 */
function StoryDeck({ stories: initialStories, isActive, navigation, onNextUser, onPrevUser, onClose }) {
  const [stories, setStories] = useState(initialStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsVisible, setCommentsVisible] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [isActionLoading, setActionLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const progress = useSharedValue(0);
  const captionScale = useSharedValue(0);
  const menuProgress = useSharedValue(0);

  const swipeTranslateY = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);

  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const isProgressPaused = isCommentsVisible || isMenuOpen || Boolean(confirmation) || isZoomed;

  useEffect(() => {
    if (!isActive) {
      progress.value = 0;
      setCurrentIndex(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (stories.length > 0 && user && isActive) {
      const currentStory = stories[currentIndex];
      if (currentStory && (!currentStory.viewers || !currentStory.viewers.includes(user.uid))) {
        updateDoc(doc(db, 'stories', currentStory.id), {
          viewers: arrayUnion(user.uid),
        }).catch(e => console.error('Failed to update viewers', e));

        setStories(prev => {
          const next = [...prev];
          if (!next[currentIndex].viewers) next[currentIndex].viewers = [];
          next[currentIndex].viewers.push(user.uid);
          return next;
        });
      }
    }
  }, [currentIndex, stories.length, user, isActive]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      progress.value = 0;
      setCurrentIndex(currentIndex + 1);
    } else {
      onNextUser();
    }
  };

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(progress);
      return;
    }
    if (isProgressPaused) {
      cancelAnimation(progress);
    } else {
      const remainingTime = 5000 * (1 - progress.value);
      progress.value = withTiming(1, { duration: remainingTime, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(handleNext)();
      });
    }
  }, [isProgressPaused, currentIndex, isActive, stories]);

  useEffect(() => {
    menuProgress.value = withTiming(isMenuOpen ? 1 : 0, { duration: 160 });
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isActive) return;
    captionScale.value = 0;
    if (stories.length > 0 && stories[currentIndex]?.caption) {
      captionScale.value = withSpring(1, { damping: 12 });
    }
  }, [currentIndex, stories, isActive]);

  useEffect(() => {
    swipeTranslateY.value = 0;
    swipeOpacity.value = 1;
  }, [currentIndex, isActive]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      progress.value = 0;
      setCurrentIndex(currentIndex - 1);
    } else {
      onPrevUser();
    }
  };

  const SWIPE_UP_DISTANCE = -60;
  const SWIPE_UP_VELOCITY = -600;

  const swipeUpRef = useRef(onClose);
  swipeUpRef.current = onClose;
  const callClose = () => swipeUpRef.current?.();

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

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeTranslateY.value }],
    opacity: swipeOpacity.value,
  }));

  const handleTapLeft = () => handlePrev();
  const handleTapRight = () => handleNext();

  const handleShare = async () => {
    setMenuOpen(false);
    try {
      await Share.share({ message: `Check out ${currentStory.username}'s story on AnimaVibe.` });
    } catch (error) {
      console.error('Failed to share story:', error);
    }
  };

  const handleDelete = (storyId) => {
    setMenuOpen(false);
    if (!user?.uid) return;
    setConfirmation({
      title: 'Delete Story',
      message: 'This story will be permanently deleted. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      iconName: 'trash-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteDoc(doc(db, 'stories', storyId));
          setConfirmation(null);
          onClose();
        } catch (e) {
          console.error('Failed to remove story:', e);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleArchive = (storyId) => {
    setMenuOpen(false);
    if (!user?.uid) return;
    setConfirmation({
      title: 'Archive Story',
      message: 'Move this story to your archive before it expires?',
      confirmLabel: 'Archive',
      destructive: false,
      iconName: 'archive-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await archiveStory(storyId, user.uid);
          setConfirmation(null);
          onClose();
        } catch (e) {
          console.error('Failed to archive story:', e);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleLike = async () => {
    if (!user || stories.length === 0) return;
    const currentStory = stories[currentIndex];
    const isLiked = currentStory.likedBy?.includes(user.uid);
    setStories(prev => {
      const next = [...prev];
      if (!next[currentIndex].likedBy) next[currentIndex].likedBy = [];
      if (isLiked) {
        next[currentIndex].likedBy = next[currentIndex].likedBy.filter(id => id !== user.uid);
        next[currentIndex].likesCount = Math.max(0, (next[currentIndex].likesCount || 1) - 1);
      } else {
        next[currentIndex].likedBy.push(user.uid);
        next[currentIndex].likesCount = (next[currentIndex].likesCount || 0) + 1;
      }
      return next;
    });
    try {
      await toggleLikeStory(currentStory.id, user.uid, user);
    } catch (e) {
      console.error(e);
      setStories(prev => {
        const next = [...prev];
        if (isLiked) {
          if (!next[currentIndex].likedBy) next[currentIndex].likedBy = [];
          next[currentIndex].likedBy.push(user.uid);
          next[currentIndex].likesCount = (next[currentIndex].likesCount || 0) + 1;
        } else {
          next[currentIndex].likedBy = next[currentIndex].likedBy?.filter(id => id !== user.uid) || [];
          next[currentIndex].likesCount = Math.max(0, (next[currentIndex].likesCount || 1) - 1);
        }
        return next;
      });
    }
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -8 },
      { scale: 0.96 + (menuProgress.value * 0.04) },
    ],
  }));

  const captionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captionScale.value }],
    opacity: captionScale.value,
  }));

  const renderTextWithHashtags = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#') && word.trim().length > 1) {
        return (
          <Text
            key={index}
            style={{ color: colors.brand }}
            onPress={() => navigation.navigate('MainApp', {
              screen: 'Discovery',
              params: { screen: 'DiscoveryMain', params: { searchQuery: word.trim(), activeTab: 'post' } },
            })}
            suppressHighlighting
          >
            {word}
          </Text>
        );
      }
      return <Text key={index}>{word}</Text>;
    });
  };

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  const displayAvatar = (user && currentStory.userId === user.uid)
    ? (userProfile?.photoURL || currentStory.userPhoto)
    : currentStory.userPhoto;
  const displayName = (user && currentStory.userId === user.uid)
    ? (userProfile?.displayName || userProfile?.username || user?.displayName)
    : currentStory.username;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <GestureDetector gesture={swipeUpGesture}>
      <Animated.View style={[styles.deckContainer, swipeAnimatedStyle]}>
        {/* Progress bars */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <ProgressBarItem
                index={index}
                currentIndex={currentIndex}
                progress={progress}
                colors={colors}
              />
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

        {/* Left / Right tap zones (behind overlay, above image) */}
        <View style={styles.touchAreaContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.touchArea} onPress={handleTapLeft} activeOpacity={1} />
          <TouchableOpacity style={styles.touchArea} onPress={handleTapRight} activeOpacity={1} />
        </View>

        {/* Overlay: header + footer */}
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
            <Text style={styles.username}>{currentStory.username}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(currentStory.createdAt)}</Text>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={styles.menuBtn}
              pointerEvents="auto"
            >
              <Ionicons name="ellipsis-horizontal" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Swipe-up hint */}
          <View style={styles.swipeHint} pointerEvents="none">
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.swipeHintText}>Swipe up to close</Text>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer} pointerEvents="box-none">
            {currentStory.caption ? (
              <Animated.View style={[styles.captionBubbleContainer, captionStyle]}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.captionAvatar} />
                ) : (
                  <View style={[styles.captionAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitialSm}>{initial}</Text>
                  </View>
                )}
                <View style={styles.captionBubble}>
                  <Text style={styles.captionText}>{renderTextWithHashtags(currentStory.caption)}</Text>
                </View>
              </Animated.View>
            ) : null}

            <View style={styles.footerRow} pointerEvents="box-none">
              {user && currentStory.userId === user.uid && (
                <Text style={styles.viewers}>
                  Viewed by {currentStory.viewers?.length || 0} people
                </Text>
              )}
              <View style={styles.iconRow} pointerEvents="box-none">
                <TouchableOpacity style={styles.iconBtn} onPress={() => setCommentsVisible(true)}>
                  <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLike}>
                  <Ionicons
                    name={currentStory.likedBy?.includes(user?.uid) ? 'heart' : 'heart-outline'}
                    size={26}
                    color={currentStory.likedBy?.includes(user?.uid) ? colors.danger : colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Dropdown menu */}
        <Modal
          transparent
          visible={isMenuOpen}
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.dropdownLayer}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <Animated.View style={[styles.dropdownMenu, menuAnimatedStyle]}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color={colors.text} />
                <Text style={styles.dropdownText}>Share</Text>
              </TouchableOpacity>

              {user && currentStory.userId === user.uid && (
                <>
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => handleArchive(currentStory.id)}>
                    <Ionicons name="archive-outline" size={18} color={colors.text} />
                    <Text style={styles.dropdownText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDelete(currentStory.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[styles.dropdownText, styles.dropdownDangerText]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </View>
        </Modal>

        {/* Story comments */}
        <StoryCommentsModal
          visible={isCommentsVisible}
          onClose={() => setCommentsVisible(false)}
          storyId={currentStory.id}
          navigation={navigation}
        />

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
// StoryScreen — root screen: fetches + groups stories, renders PagerView
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ navigation: Object, route: Object }} props
 */
export default function StoryScreen({ navigation, route }) {
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeUserIndex, setActiveUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const pagerRef = useRef(null);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const currentUser = useAuthStore((state) => state.user);
  const targetUserId = route.params?.userId;
  const storyUserIds = route.params?.storyUserIds;
  const viewingSelf = targetUserId === currentUser?.uid;

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getActiveStories();

        const map = new Map();
        data.forEach(s => {
          if (!map.has(s.userId)) map.set(s.userId, []);
          map.get(s.userId).push(s);
        });

        map.forEach((stories, uid) => {
          map.set(uid, stories.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          }));
        });

        if (viewingSelf) {
          const myStories = map.get(currentUser.uid);
          if (myStories?.length > 0) {
            setGroupedStories([myStories]);
            setActiveUserIndex(0);
          } else {
            setGroupedStories([]);
          }
        } else {
          let otherGroups = [];

          if (storyUserIds?.length > 0) {
            storyUserIds.forEach(uid => {
              const group = map.get(uid);
              if (group?.length > 0) otherGroups.push(group);
            });
            map.forEach((group, uid) => {
              if (uid !== currentUser?.uid && !storyUserIds.includes(uid)) {
                otherGroups.push(group);
              }
            });
          } else {
            map.forEach((group, uid) => {
              if (uid !== currentUser?.uid) otherGroups.push(group);
            });
            otherGroups.sort((groupA, groupB) => {
              const aAllSeen = groupA.every(s => s.viewers?.includes(currentUser?.uid));
              const bAllSeen = groupB.every(s => s.viewers?.includes(currentUser?.uid));
              if (aAllSeen !== bAllSeen) return aAllSeen ? 1 : -1;
              const aLatest = groupA[0]?.createdAt?.toMillis?.() ?? 0;
              const bLatest = groupB[0]?.createdAt?.toMillis?.() ?? 0;
              return bLatest - aLatest;
            });
          }

          setGroupedStories(otherGroups);

          if (targetUserId) {
            const idx = otherGroups.findIndex(g => g[0]?.userId === targetUserId);
            if (idx !== -1) setActiveUserIndex(idx);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [targetUserId]);

  const goNextUser = () => {
    if (activeUserIndex < groupedStories.length - 1) {
      pagerRef.current?.setPage(activeUserIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goPrevUser = () => {
    if (activeUserIndex > 0) {
      pagerRef.current?.setPage(activeUserIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (groupedStories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>No stories available.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.brand }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      <PagerView
        ref={pagerRef}
        style={styles.container}
        initialPage={activeUserIndex}
        onPageSelected={(e) => setActiveUserIndex(e.nativeEvent.position)}
      >
        {groupedStories.map((userStories, index) => (
          <View key={userStories[0].userId} style={styles.container}>
            <StoryDeck
              stories={userStories}
              isActive={index === activeUserIndex}
              navigation={navigation}
              onNextUser={goNextUser}
              onPrevUser={goPrevUser}
              onClose={() => navigation.goBack()}
            />
          </View>
        ))}
      </PagerView>
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
    height: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 2,
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
    marginLeft: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
    fontSize: 12,
  },
  menuBtn: {
    marginLeft: 'auto',
    marginRight: 8,
    padding: 4,
  },
  swipeHint: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  dropdownLayer: {
    flex: 1,
    marginTop: 10,
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
  dropdownDangerText: {
    color: colors.danger,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  viewers: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 8,
  },
  captionBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginBottom: 10,
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
