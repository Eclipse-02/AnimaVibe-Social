import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Platform, StatusBar, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import PostCard from '../../components/PostCard';
import { subscribeToActiveStories } from '../../lib/firestore/stories';
import { subscribeToFeedPosts } from '../../lib/firestore/posts';
import { useThemeColors } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';

export default function FeedScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setToastVisible] = useState(false);
  const toastProgress = useSharedValue(0);

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [{ translateY: (1 - toastProgress.value) * 18 }],
  }));

  const showActionToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    toastProgress.value = 0;
    toastProgress.value = withTiming(1, { duration: 220 });

    setTimeout(() => {
      toastProgress.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(setToastVisible)(false);
      });
    }, 1800);
  };

  useEffect(() => {
    const unsubscribePosts = subscribeToFeedPosts(
      (enrichedPosts) => setPosts(enrichedPosts),
      (error) => console.error('Feed error:', error)
    );

    const unsubscribeStories = subscribeToActiveStories(
      (activeStories) => setStories(activeStories),
      (error) => console.error('Stories error:', error)
    );

    return () => {
      unsubscribePosts();
      unsubscribeStories();
    };
  }, []);

  const renderStory = ({ item, index }) => {
    if (!user) return null;
    const isMine = index === 0;

    const myStories = stories.filter(s => s.userId === user?.uid);
    const hasMyStory = myStories.length > 0;

    const displayAvatar = isMine
      ? (userProfile?.photoURL || user?.photoURL)
      : item.userPhoto;

    const displayName = isMine ? (userProfile?.displayName || userProfile?.username || user?.displayName) : item.username;
    const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

    let hasSeen = false;
    if (isMine) {
      hasSeen = myStories.every(s => s.viewers?.includes(user?.uid));
    } else {
      hasSeen = item.allSeen !== undefined ? item.allSeen : (item.viewers && item.viewers.includes(user?.uid));
    }

    const isGradient = (isMine && hasMyStory && !hasSeen) || (!isMine && !hasSeen);

    const renderRing = () => {
      if (isGradient) {
        return (
          <LinearGradient
            colors={[colors.brand, colors.danger, colors.warning]}
            style={styles.storyRingGradient}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={[styles.storyRingInner, { backgroundColor: colors.background }]}>
              {displayAvatar ? (
                <Image
                  source={{ uri: displayAvatar }}
                  style={styles.storyAvatar}
                  cachePolicy="disk"
                />
              ) : (
                <View style={[styles.storyAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>{initial}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        );
      }

      return (
        <View style={[
          styles.storyRing,
          isMine && !hasMyStory ? styles.noStoryRing : styles.seenStoryRing
        ]}>
          {displayAvatar ? (
            <Image
              source={{ uri: displayAvatar }}
              style={styles.storyAvatar}
              cachePolicy="disk"
            />
          ) : (
            <View style={[styles.storyAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>{initial}</Text>
            </View>
          )}
        </View>
      );
    };

    return (
      <View style={styles.storyContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!user) return;
            if (isMine) {
              if (hasMyStory) {
                navigation.navigate('StoryScreen', { userId: user?.uid });
              } else {
                navigation.navigate('CreateStoryScreen');
              }
            } else {
              navigation.navigate('StoryScreen', { userId: item.userId });
            }
          }}
        >
          {renderRing()}
        </TouchableOpacity>

        {isMine && (
          <TouchableOpacity
            style={styles.addStoryBadge}
            onPress={() => navigation.navigate('CreateStoryScreen')}
          >
            <Ionicons
              name="add"
              size={14}
              color={colors.text}
            />
          </TouchableOpacity>
        )}

        <Text
          style={styles.storyUsername}
          numberOfLines={1}
        >
          {isMine ? 'Your story' : item.username}
        </Text>
      </View>
    );
  };

  const openCreateStory = () => {
    navigation.navigate('CreateStoryScreen');
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(20)
    .onEnd((e) => {
      if (e.translationX > 60) {
        runOnJS(openCreateStory)();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostCard post={item} onActionToast={showActionToast} />
          )}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.headerSection}>
              <View style={styles.mainHeader}>
                <View style={styles.logoContainer}>
                  <MaterialIcons
                    name="bubble-chart"
                    size={24}
                    color={colors.brand}
                  />
                  <Text style={styles.logoText}>
                    ANIMAVIBE
                  </Text>
                </View>
              </View>

              <FlatList
                data={[
                  { id: 'me' },
                  ...(() => {
                    const map = new Map();
                    stories.forEach(s => {
                      if (s.userId !== user?.uid && userProfile?.following?.includes(s.userId)) {
                        if (!map.has(s.userId)) {
                          map.set(s.userId, {
                            ...s,
                            allSeen: s.viewers?.includes(user?.uid) || false
                          });
                        } else {
                          const existing = map.get(s.userId);
                          if (!s.viewers?.includes(user?.uid)) {
                            existing.allSeen = false;
                          }
                        }
                      }
                    });
                    return Array.from(map.values());
                  })()
                ]}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderStory}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.storiesList}
              />
            </View>
          )}
        />

        <Modal transparent visible={isToastVisible} animationType="none" statusBarTranslucent>
          <View pointerEvents="none" style={styles.toastOverlay}>
            <Animated.View style={[styles.toast, toastAnimatedStyle]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureDetector>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  headerSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 4
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBtn: {
    marginLeft: 20
  },
  storiesList: {
    paddingHorizontal: 16
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
    position: 'relative'
  },
  storyRingGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center'
  },
  storyRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  storyRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  seenStoryRing: {
    borderColor: colors.border
  },
  noStoryRing: {
    borderColor: 'transparent'
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface
  },
  addStoryBadge: {
    position: 'absolute',
    bottom: 25,
    right: 5,
    backgroundColor: colors.brandDark,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 1
  },
  storyUsername: {
    color: colors.text,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center'
  },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 96
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  toastText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8
  }
});
