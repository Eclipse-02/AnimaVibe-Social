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
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;
const tripleColumnWidth = (width - 48) / 3; 

const MOCK_DATA = [
  { id: '1', type: 'wide', uri: 'https://picsum.photos/400/300' },
  { id: '2', type: 'tall', uri: 'https://picsum.photos/300/600' },
  { id: '3', type: 'square', uri: 'https://picsum.photos/300/300' },
];

export default function DiscoveryScreen() {
  const navigation = useNavigation();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('akun');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    let unsubscribe = () => {};

    const cleanQuery = searchQuery.trim().toLowerCase();

    if (activeTab === 'akun') {
      const displayQuery = cleanQuery.startsWith('@') ? cleanQuery.slice(1) : cleanQuery;
      unsubscribe = firestore()
        .collection('users')
        .where('username', '>=', displayQuery)
        .where('username', '<=', displayQuery + '\uf8ff')
        .limit(20)
        .onSnapshot(
          snapshot => {
            const users = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              if (doc.id !== currentUserId) {
                users.push({ id: doc.id, type: 'user', ...data });
              }
            });
            setSearchResults(users);
            setLoading(false);
          },
          error => {
            console.error(error);
            setLoading(false);
          }
        );
    } 

    else if (activeTab === 'hashtag') {
      const tagQuery = cleanQuery.startsWith('#') ? cleanQuery.slice(1) : cleanQuery;
      unsubscribe = firestore()
        .collection('posts')
        .where('tags', 'array-contains', tagQuery)
        .limit(20)
        .onSnapshot(
          snapshot => {
            const tagsMap = new Map();
            snapshot.forEach(doc => {
              const data = doc.data();
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
            setSearchResults(Array.from(tagsMap.values()));
            setLoading(false);
          },
          error => {
            console.error(error);
            setLoading(false);
          }
        );
    } 

    else if (activeTab === 'post') {
      unsubscribe = firestore()
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .onSnapshot(
          snapshot => {
            const posts = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              const caption = (data.caption || '').toLowerCase();
              if (caption.includes(cleanQuery)) {
                posts.push({ id: doc.id, type: 'post', ...data });
              }
            });
            setSearchResults(posts);
            setLoading(false);
          },
          error => {
            console.error(error);
            setLoading(false);
          }
        );
    }

    return () => unsubscribe();
  }, [searchQuery, activeTab]);

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('akun');
  };

  const renderSearchItem = ({ item }) => {
    if (activeTab === 'akun') {
      return (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() =>
            navigation.navigate('ProfileTab', {
              screen: 'Profile',
              params: { userId: item.id }
            })
          }
        >
          <Image
            source={
              item.photoURL
                ? { uri: item.photoURL }
                : { uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }
            }
            style={styles.searchAvatar}
            contentFit="cover"
          />
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {item.displayName || 'User AnimaVibe'}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'hashtag') {
      return (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('TagResults', { tag: item.tagName })}
        >
          <View style={styles.hashtagIconCircle}>
            <Ionicons name="pricetag-outline" size={20} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{item.tagName}</Text>
            <Text style={styles.username}>{item.count} postingan terkait</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'post') {
      return (
        <TouchableOpacity
          style={styles.postGridItem}
          onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item } })}
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
          <Ionicons name="search" size={20} color="#888" />
          {isSearching ? (
            <TextInput
              style={styles.searchInputField}
              placeholder={`Cari berdasarkan ${activeTab}...`}
              placeholderTextColor="#666"
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
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <View style={{ flex: 1 }}>
          <View style={styles.tabBarContainer}>
            {['akun', 'hashtag', 'post'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                onPress={() => {
                  setActiveTab(tab);
                  setSearchResults([]);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'akun' ? 'Akun' : tab === 'hashtag' ? 'Hashtag' : 'Postingan'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <ActivityIndicator
              size="small"
              color="#fff"
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
                <Text style={styles.emptyText}>Hasil tidak ditemukan.</Text>
              ) : (
                <Text style={styles.emptyText}>Ketik kata kunci pencarian...</Text>
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
                  onPress={() => navigation.navigate('TagResults', { tag })}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FlatList
            key="discovery-grid"
            data={MOCK_DATA}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.imageWrapper,
                  { height: item.type === 'tall' ? 250 : 150 }
                ]}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.image}
                  contentFit="cover"
                />
              </View>
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    backgroundColor: '#161616',
    padding: 12,
    borderRadius: 12,
    flex: 1
  },
  searchInputField: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    padding: 0
  },
  searchText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 14
  },
  cancelButton: {
    marginLeft: 12,
    paddingVertical: 8
  },
  cancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  /* STYLING TAB BAR BARU */
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
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
    borderBottomColor: '#fff'
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  trendingContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16
  },
  trendingTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  tagRow: {
    flexDirection: 'row'
  },
  tag: {
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8
  },
  tagText: {
    color: '#fff',
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
    borderBottomColor: '#111'
  },
  searchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222'
  },
  hashtagIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  userInfo: {
    marginLeft: 12,
    flex: 1
  },
  displayName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  username: {
    color: '#666',
    fontSize: 13,
    marginTop: 1
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
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