import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useThemeColors } from '../../hooks/useTheme';
import { searchUsers } from '../../lib/firestore/users';
import { searchPosts } from '../../lib/firestore/posts';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;
const tripleColumnWidth = (width - 48) / 3;

export default function DiscoveryScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  const [searchResults, setSearchResults] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserId = auth().currentUser?.uid;
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const openRootPostDetail = (post) => {
    const tabNavigator = navigation.getParent?.();
    const rootNavigator = tabNavigator?.getParent?.();

    if (rootNavigator) {
      rootNavigator.navigate('PostDetail', { post });
      return;
    }

    navigation.navigate('PostDetail', { post });
  };

  useEffect(() => {
    if (route.params?.searchQuery) {
      setIsSearching(true);
      setSearchQuery(route.params.searchQuery);
      if (route.params.activeTab) setActiveTab(route.params.activeTab);
    }
  }, [route.params?.searchQuery, route.params?.activeTab]);

  useEffect(() => {
    if (isSearching) return;
    const unsubscribe = firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .onSnapshot(
        snapshot => {
          const posts = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            // Skip archived posts — they should not appear in the discovery grid
            if (data.archived === true) return;
            posts.push({ id: doc.id, ...data });
          });
          setRecentPosts(posts);
        },
        error => console.error(error)
      );
    return () => unsubscribe();
  }, [isSearching]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe = () => { };
    let cancelled = false;

    const cleanQuery = searchQuery.trim().toLowerCase();

    if (activeTab === 'account') {
      const timer = setTimeout(async () => {
        try {
          const users = await searchUsers(cleanQuery, { excludeUserId: currentUserId });
          if (!cancelled) setSearchResults(users);
        } catch (error) {
          console.error(error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }, 300);
      unsubscribe = () => clearTimeout(timer);
    }

    else if (activeTab === 'hashtag') {
      const tagQuery = cleanQuery.startsWith('#') ? cleanQuery.slice(1) : cleanQuery;
      let unsubscribeHashtag = () => { };
      const timer = setTimeout(() => {
        if (cancelled) return;
        unsubscribeHashtag = firestore()
          .collection('posts')
          .where('tags', 'array-contains', tagQuery)
          .limit(20)
          .onSnapshot(
            snapshot => {
              const tagsMap = new Map();
              snapshot.forEach(doc => {
                const data = doc.data();
                // Skip archived posts — their tags must not count toward the hashtag counter
                if (data.archived === true) return;
                if (data.tags && Array.isArray(data.tags)) {
                  data.tags.forEach(t => {
                    if (t.toLowerCase().includes(tagQuery)) {
                      if (!tagsMap.has(t)) {
                        tagsMap.set(t, { id: t, type: 'tag', tagName: '#' + t, count: 1 });
                      } else {
                        tagsMap.get(t).count += 1;
                      }
                    }
                  });
                }
              });
              if (!cancelled) {
                setSearchResults(Array.from(tagsMap.values()));
                setLoading(false);
              }
            },
            error => {
              console.error(error);
              if (!cancelled) setLoading(false);
            }
          );
      }, 300);
      unsubscribe = () => {
        clearTimeout(timer);
        unsubscribeHashtag();
      };
    }

    else if (activeTab === 'post') {
      const timer = setTimeout(async () => {
        try {
          const posts = await searchPosts(searchQuery);
          if (!cancelled) setSearchResults(posts);
        } catch (error) {
          console.error(error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }, 300);
      unsubscribe = () => clearTimeout(timer);
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [searchQuery, activeTab, currentUserId]);

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('account');
  };

  const renderSearchItem = ({ item }) => {
    if (activeTab === 'account') {
      return (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() =>
            navigation.navigate('ProfileScreen', { userId: item.id })
          }
        >
          <Image
            source={item.photoURL}
            style={styles.searchAvatar}
            contentFit="cover"
          />
          <View style={styles.userInfo}>
            <Text style={styles.usernameText}>{item.username}</Text>
            <Text style={styles.subText}>{item.displayName || 'User AnimaVibe'}</Text>
            {item.followersCount > 0 && <Text style={styles.subText}>{item.followersCount} followers</Text>}
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'hashtag') {
      return (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => {
            setIsSearching(true);
            setSearchQuery(item.tagName);
            setActiveTab('post');
          }}
        >
          <View style={styles.hashtagIconCircle}>
            <Text style={styles.hashtagSymbol}>#</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.usernameText}>{item.tagName}</Text>
            <Text style={styles.subText}>
              {item.count > 1000 ? (item.count / 1000).toFixed(1) + 'K' : item.count} posts
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'post') {
      return (
        <TouchableOpacity
          style={styles.postGridItem}
          onPress={() => openRootPostDetail(item)}
        >
          <Image source={{ uri: item.mediaURL || item.image }} style={styles.postGridImage} contentFit="cover" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerRow}>
        <View style={[styles.searchContainer, isSearching && { flex: 1, marginRight: 0 }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          {isSearching ? (
            <TextInput
              style={styles.searchInputField}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              autoFocus={true}
              autoCapitalize="none"
            />
          ) : (
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsSearching(true)}>
              <Text style={styles.searchText}>Search users, posts, tags...</Text>
            </TouchableOpacity>
          )}
        </View>

        {isSearching && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <View style={{ flex: 1 }}>
          <View style={styles.tabBarContainer}>
            {['account', 'hashtag', 'post'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                onPress={() => {
                  setActiveTab(tab);
                  setSearchResults([]);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'account' ? 'Account' : tab === 'hashtag' ? 'Hashtag' : 'Post'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.text}
              style={{ marginTop: 15 }}
            />
          )}

          <FlatList
            key={activeTab === 'post' ? 'post-grid' : 'normal-list'}
            data={searchResults}
            renderItem={renderSearchItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            numColumns={activeTab === 'post' ? 3 : 1}
            columnWrapperStyle={activeTab === 'post' ? styles.postColumnWrapper : null}
            contentContainerStyle={{ paddingHorizontal: activeTab === 'post' ? 0 : 16, paddingTop: 8 }}
            ListEmptyComponent={
              !loading && searchQuery.length > 0 ? (
                <Text style={styles.emptyText}>Result not found.</Text>
              ) : (
                <Text style={styles.emptyText}>Type a search query...</Text>
              )
            }
          />
        </View>
      ) : (

        <View style={{ flex: 1 }}>
          <View style={styles.trendingContainer}>
            <Text style={styles.trendingTitle}>TRENDING</Text>
            <View style={styles.tagRow}>
              {['#photography', '#design', '#travel', '#architecture'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onPress={() => {
                    setIsSearching(true);
                    setSearchQuery(tag);
                    setActiveTab('post');
                  }}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FlatList
            key="discovery-grid"
            data={recentPosts}
            renderItem={({ item, index }) => {
              const isTall = index % 3 === 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.imageWrapper,
                    { height: isTall ? 250 : 150 }
                  ]}
                  activeOpacity={0.9}
                  onPress={() => openRootPostDetail(item)}
                >
                  <Image
                    source={{ uri: item.mediaURL || item.image }}
                    style={styles.image}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recent posts.</Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    padding: 12,
    borderRadius: 12,
    flex: 1
  },
  searchInputField: {
    flex: 1,
    color: colors.text,
    marginLeft: 10,
    fontSize: 14,
    padding: 0
  },
  searchText: {
    color: colors.textSecondary,
    marginLeft: 10,
    fontSize: 14
  },
  cancelButton: {
    marginLeft: 12,
    paddingVertical: 8
  },
  cancelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
    marginTop: 10
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTabItem: {
    borderBottomColor: colors.text
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  activeTabText: {
    color: colors.text,
    fontWeight: 'bold'
  },
  trendingContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16
  },
  trendingTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  tagRow: {
    flexDirection: 'row'
  },
  tag: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8
  },
  tagText: {
    color: colors.text,
    fontSize: 12
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  imageWrapper: {
    width: columnWidth,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden'
  },
  image: {
    flex: 1
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  searchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh
  },
  hashtagIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  hashtagSymbol: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '400'
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'center'
  },
  usernameText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
    fontSize: 14
  },
  postColumnWrapper: {
    justifyContent: 'flex-start'
  },
  postGridItem: {
    width: tripleColumnWidth,
    height: tripleColumnWidth,
    margin: 1
  },
  postGridImage: {
    flex: 1
  }
});
