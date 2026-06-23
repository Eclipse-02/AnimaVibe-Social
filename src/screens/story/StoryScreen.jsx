import React, { useState, useEffect, useRef } from 'react';
import { Modal, Pressable, Share, StyleSheet, View, Text, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Animated, { useSharedValue, withTiming, Easing, runOnJS, useAnimatedStyle, withSpring, cancelAnimation } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PagerView from 'react-native-pager-view';
import { archiveStory, getActiveStories, toggleLikeStory } from '../../lib/firestore/stories';
import { getTimeAgo } from '../../lib/firestore/posts';
import { useAuthStore } from '../../store/authStore';
import StoryCommentsModal from '../../components/StoryCommentsModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useThemeColors } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

/**
 * Renders one user's story deck and pauses progress while overlays are open.
 * @param {{ stories: Object[], isActive: boolean, navigation: Object, onNextUser: Function, onPrevUser: Function, onClose: Function }} props
 */
function StoryDeck({ stories: initialStories, isActive, navigation, onNextUser, onPrevUser, onClose }) {
  const [stories, setStories] = useState(initialStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsVisible, setCommentsVisible] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [isActionLoading, setActionLoading] = useState(false);
  const progress = useSharedValue(0);
  const captionScale = useSharedValue(0);
  const menuProgress = useSharedValue(0);
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const isProgressPaused = isCommentsVisible || isMenuOpen || Boolean(confirmation);

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
          viewers: arrayUnion(user.uid)
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

  const handlePrev = () => {
    if (currentIndex > 0) {
      progress.value = 0;
      setCurrentIndex(currentIndex - 1);
    } else {
      onPrevUser();
    }
  };

  const handleShare = async () => {
    setMenuOpen(false);
    try {
      await Share.share({
        message: `Check out ${currentStory.username}'s story on AnimaVibe.`,
      });
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

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -8 },
      { scale: 0.96 + (menuProgress.value * 0.04) },
    ],
  }));

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

  const captionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captionScale.value }],
    opacity: captionScale.value
  }));

  const renderTextWithHashtags = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#') && word.trim().length > 1) {
        return (
          <Text
            key={index}
            style={{ color: colors.brand }}
            onPress={() => {
              navigation.navigate('MainApp', {
                screen: 'Discovery',
                params: {
                  screen: 'DiscoveryMain',
                  params: { searchQuery: word.trim(), activeTab: 'post' }
                }
              });
            }}
            suppressHighlighting={true}
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
  const displayAvatar = (user && currentStory.userId === user.uid) ? (userProfile?.photoURL || currentStory.userPhoto) : currentStory.userPhoto;
  const displayName = (user && currentStory.userId === user.uid) ? (userProfile?.displayName || userProfile?.username || user?.displayName) : currentStory.username;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.deckContainer}>
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBg}>
            <ProgressBarItem index={index} currentIndex={currentIndex} progress={progress} colors={colors} />
          </View>
        ))}
      </View>

      <View style={styles.content}>
        <Image source={{ uri: currentStory.mediaUrl }} style={styles.storyImage} contentFit="cover" />

        <View style={styles.touchAreaContainer}>
          <TouchableOpacity style={styles.touchArea} onPress={handlePrev} activeOpacity={1} />
          <TouchableOpacity style={styles.touchArea} onPress={handleNext} activeOpacity={1} />
        </View>

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceHigh }]}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{initial}</Text>
              </View>
            )}
            <Text style={styles.username}>{currentStory.username}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(currentStory.createdAt)}</Text>
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
              <Ionicons name="ellipsis-horizontal" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Modal transparent visible={isMenuOpen} animationType="none" statusBarTranslucent onRequestClose={() => setMenuOpen(false)}>
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

          <View style={styles.footerContainer}>
            {currentStory.caption ? (
              <Animated.View style={[styles.captionBubbleContainer, captionStyle]}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.captionAvatar} />
                ) : (
                  <View style={[styles.captionAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceHigh }]}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }}>{initial}</Text>
                  </View>
                )}
                <View style={styles.captionBubble}>
                  <Text style={styles.captionText}>{renderTextWithHashtags(currentStory.caption)}</Text>
                </View>
              </Animated.View>
            ) : null}

            <View style={styles.footerRow}>
              {user && currentStory.userId === user.uid && (
                <Text style={styles.viewers}>Viewed by {currentStory.viewers?.length || 0} people</Text>
              )}
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setCommentsVisible(true)}>
                  <Ionicons name="chatbubble-outline" size={28} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLike}>
                  <Ionicons
                    name={currentStory.likedBy?.includes(user?.uid) ? "heart" : "heart-outline"}
                    size={28}
                    color={currentStory.likedBy?.includes(user?.uid) ? colors.danger : colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      <StoryCommentsModal
        visible={isCommentsVisible}
        onClose={() => setCommentsVisible(false)}
        storyId={currentStory.id}
        navigation={navigation}
      />

      <ConfirmationModal
        visible={Boolean(confirmation)}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        confirmLabel={confirmation?.confirmLabel}
        destructive={confirmation?.destructive}
        iconName={confirmation?.iconName}
        isLoading={isActionLoading}
        onCancel={() => {
          if (!isActionLoading) setConfirmation(null);
        }}
        onConfirm={() => confirmation?.onConfirm?.()}
      />
    </View>
  );
}

function ProgressBarItem({ index, currentIndex, progress, colors }) {
  const animatedStyle = useAnimatedStyle(() => {
    let widthVal = '0%';
    if (index < currentIndex) widthVal = '100%';
    else if (index === currentIndex) widthVal = (progress.value * 100) + '%';
    return { width: widthVal };
  });
  return <Animated.View style={[{ height: 4, backgroundColor: colors.text, borderRadius: 2 }, animatedStyle]} />;
}

export default function StoryScreen({ navigation, route }) {
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeUserIndex, setActiveUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const pagerRef = useRef(null);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getActiveStories();
        const groups = [];
        const map = new Map();
        data.forEach(s => {
          if (!map.has(s.userId)) {
            map.set(s.userId, []);
            groups.push(s.userId);
          }
          map.get(s.userId).push(s);
        });

        const formatted = groups.map(id => map.get(id));
        setGroupedStories(formatted);

        const targetUserId = route.params?.userId;
        if (targetUserId) {
          const idx = groups.indexOf(targetUserId);
          if (idx !== -1) setActiveUserIndex(idx);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [route?.params?.userId]);

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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.text} /></View>;
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

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  deckContainer: {
    flex: 1
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    height: 4,
    zIndex: 10
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    borderRadius: 2
  },
  content: {
    flex: 1
  },
  storyImage: {
    width: '100%',
    height: '100%'
  },
  touchAreaContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1
  },
  touchArea: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    zIndex: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  username: {
    color: colors.text,
    marginLeft: 10,
    fontWeight: 'bold'
  },
  timeAgo: {
    color: colors.textSecondary,
    marginLeft: 8,
    fontSize: 12
  },
  menuBtn: {
    marginLeft: 'auto',
    marginRight: 15
  },
  dropdownLayer: {
    flex: 1,
    marginTop: 10
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
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  dropdownText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10
  },
  dropdownDangerText: {
    color: colors.danger
  },
  closeBtn: {
    marginLeft: 'auto'
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border
  },
  viewers: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  captionBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginBottom: 10
  },
  captionAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  captionBubble: {
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: width * 0.6
  },
  captionText: {
    color: colors.background,
    fontSize: 14
  },
});
