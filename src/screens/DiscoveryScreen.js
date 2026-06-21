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

const MOCK_DATA = [
  { id: '1', type: 'wide', uri: 'https://picsum.photos/400/300' },
  { id: '2', type: 'tall', uri: 'https://picsum.photos/300/600' },
  { id: '3', type: 'square', uri: 'https://picsum.photos/300/300' },
];

export default function DiscoveryScreen() {
  const navigation = useNavigation();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    const unsubscribe = firestore()
      .collection('users')
      .where('username', '>=', searchQuery.toLowerCase())
      .where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
      .limit(20)
      .onSnapshot(
        snapshot => {
          const users = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (doc.id !== currentUserId) {
              users.push({ id: doc.id, ...data });
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

    return () => unsubscribe();
  }, [searchQuery]);

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderUserItem = ({ item }) => (
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerRow}>
        <View style={[styles.searchContainer, isSearching && { flex: 1, marginRight: 0 }]}>
          <Ionicons name="search" size={20} color="#888" />
          {isSearching ? (
            <TextInput
              style={styles.searchInputField}
              placeholder="Cari pengguna berdasarkan username..."
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
          {loading && (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginTop: 15 }}
            />
          )}

          <FlatList
            key="search-list"
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              !loading && searchQuery.length > 0 ? (
                <Text style={styles.emptyText}>Pengguna tidak ditemukan.</Text>
              ) : (
                <Text style={styles.emptyText}>Ketik username terdaftar...</Text>
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
  userInfo: {
    marginLeft: 12
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
  }
});