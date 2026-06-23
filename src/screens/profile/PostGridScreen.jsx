import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFeedPosts } from '../../lib/firestore/posts';
import { getArchivedStories } from '../../lib/firestore/stories';
import { useAuthStore } from '../../store/authStore';
import { useThemeColors } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const ArchiveTabs = createMaterialTopTabNavigator();

/**
 * Reusable 3-column media grid for posts and archived stories.
 * @param {{ items: Object[], loading: boolean, emptyIcon: string, emptyLabel: string, onPressItem?: Function, mediaField?: string }} props
 */
function MediaGrid({ items, loading, emptyIcon, emptyLabel, onPressItem, mediaField = 'imageUrl' }) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.gridItem}
      onPress={() => onPressItem?.(item)}
      disabled={!onPressItem}
    >
      <Image source={{ uri: item[mediaField] }} style={styles.gridImage} cachePolicy="disk" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      key="grid-3col"
      style={styles.gridList}
      contentContainerStyle={items.length === 0 ? styles.emptyListContent : undefined}
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={renderGridItem}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name={emptyIcon} size={64} color={colors.surfaceHigh} />
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      }
    />
  );
}

/**
 * Displays archived posts for the signed-in user.
 * @param {{ navigation: Object }} props
 */
function ArchivedPostsTab({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadArchivedPosts() {
      if (!user?.uid) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await getFeedPosts({
          interactionType: 'archived',
          userId: user.uid,
          pageSize: 60,
        });
        if (isMounted) setPosts(response.posts);
      } catch (error) {
        console.error('Failed to load archived posts:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadArchivedPosts();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return (
    <MediaGrid
      items={posts}
      loading={loading}
      emptyIcon="archive-outline"
      emptyLabel="No archived posts yet"
      onPressItem={(post) => navigation.navigate('PostDetail', { post })}
    />
  );
}

/**
 * Displays manually archived or expired stories for the signed-in user.
 */
function ArchivedStoriesTab() {
  const user = useAuthStore((state) => state.user);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadArchivedStories() {
      if (!user?.uid) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const archivedStories = await getArchivedStories({ userId: user.uid });
        if (isMounted) setStories(archivedStories);
      } catch (error) {
        console.error('Failed to load archived stories:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadArchivedStories();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return (
    <MediaGrid
      items={stories}
      loading={loading}
      emptyIcon="time-outline"
      emptyLabel="No archived stories yet"
      mediaField="mediaUrl"
    />
  );
}

export default function PostGridScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { type = 'favorites', title = 'Favorites' } = route.params || {};
  const isArchive = type === 'archive';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (isLoadMore = false) => {
    if (isArchive || !user?.uid || (!hasMore && isLoadMore)) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getFeedPosts({
        interactionType: type,
        userId: user.uid,
        pageSize: 15,
        lastDoc: isLoadMore ? lastDoc : null
      });

      if (isLoadMore) {
        setPosts(prev => [...prev, ...response.posts]);
      } else {
        setPosts(response.posts);
      }

      setLastDoc(response.lastDoc);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error(`Failed to load ${type} posts:`, error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.uid, type, lastDoc, hasMore, isArchive]);

  useEffect(() => {
    fetchPosts();
  }, [type, isArchive]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(true);
    }
  };

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.gridItem}
      onPress={() => {
        navigation.navigate('PostDetail', { post: item });
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} cachePolicy="disk" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {isArchive ? (
        <ArchiveTabs.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.text,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarIndicatorStyle: { backgroundColor: colors.brand },
            tabBarStyle: { backgroundColor: colors.background },
            tabBarPressColor: colors.surfaceHigh,
            tabBarLabelStyle: styles.tabLabel,
            sceneStyle: styles.tabScene,
          }}
        >
          <ArchiveTabs.Screen name="ArchivedPosts" options={{ title: 'Posts' }}>
            {(tabProps) => <ArchivedPostsTab {...tabProps} />}
          </ArchiveTabs.Screen>
          <ArchiveTabs.Screen name="ArchivedStories" component={ArchivedStoriesTab} options={{ title: 'Stories' }} />
        </ArchiveTabs.Navigator>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          key="grid-3col"
          style={styles.gridList}
          contentContainerStyle={posts.length === 0 ? styles.emptyListContent : undefined}
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderGridItem}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ margin: 20 }} size="small" color={colors.text} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={type === 'bookmarks' ? 'bookmark-outline' : 'heart-outline'}
                size={64}
                color={colors.surfaceHigh}
              />
              <Text style={styles.emptyText}>
                No {type} yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  backBtn: { padding: 4 },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold'
  },
  placeholder: { width: 36 },
  tabLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'none'
  },
  tabScene: {
    backgroundColor: colors.background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  gridList: {
    flex: 1,
    backgroundColor: colors.background
  },
  emptyListContent: {
    flexGrow: 1
  },
  gridItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    padding: 1
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 16
  },
});
