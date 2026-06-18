import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Platform, StatusBar, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons'
import PostCard from '../components/PostCard'
import { db } from '../config/firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

const DUMMY_STORIES = [
  { id: '1', user: 'Your Story', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', isMine: true },
  { id: '2', user: 'cyber_vibe', avatar: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167' },
  { id: '3', user: 'flux_zero', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12' },
  { id: '4', user: 'neon_knight', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde' },
  { id: '5', user: 'alyssa_art', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
]

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const postsRef = collection(db, 'posts')
    const q = query(postsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
      const fetchedPosts = snapshot.docs
        .filter(doc => doc.data().createdAt !== null)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timeAgo: 'Baru saja',
        }))
      setPosts(fetchedPosts)
      setLoading(false)
    }, (error) => {
      console.error("Gagal mengambil data feed:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const renderStory = ({ item }) => (
    <TouchableOpacity
      style={styles.storyContainer}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('StoryScreen')}
    >
      <View style={[styles.storyRing, item.isMine && styles.myStoryRing]}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} cachePolicy="disk" />
        {item.isMine && (
          <View style={styles.addStoryBadge}>
            <Ionicons name="add" size={12} color="#ffffff" />
          </View>
        )}
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>{item.user}</Text>
    </TouchableOpacity>
  )

  const FeedHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.mainHeader}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="bubble-chart" size={24} color="#a855f7" />
          <Text style={styles.logoText}>ANIMAVIBE</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="send" size={24} color="#ffffff" style={styles.headerSendIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.storiesWrapper}>
        <FlatList
          data={DUMMY_STORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={renderStory}
          contentContainerStyle={styles.storiesList}
        />
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          ListHeaderComponent={FeedHeader}
          renderItem={({ item }) => <PostCard post={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada postingan. Ayo jadi yang pertama!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666666', fontSize: 14, textAlign: 'center' },
  headerSection: { backgroundColor: '#000000', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#111111', marginBottom: 16 },
  mainHeader: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginLeft: 4 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 20 },
  headerSendIcon: { transform: [{ rotate: '15deg' }, { translateY: -2 }] },
  storiesWrapper: { marginTop: 8 },
  storiesList: { paddingHorizontal: 16 },
  storyContainer: { alignItems: 'center', marginRight: 20, width: 66 },
  storyRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#a855f7', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  myStoryRing: { borderColor: '#333333' },
  storyAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a1a1a' },
  addStoryBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#a855f7', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000' },
  storyUsername: { color: '#ffffff', fontSize: 11, marginTop: 8, textAlign: 'center' },
})