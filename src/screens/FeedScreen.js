import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import PostCard from '../components/PostCard';
import { getActiveStories, createStory } from '../services/stories';

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const loadStories = async () => {
      try {
        const activeStories = await getActiveStories();
        setStories(activeStories);
      } catch (e) {
        console.error(e);
      }
    };
    loadStories();
    return () => unsubscribePosts();
  }, []);

  const launchPicker = async (type) => {
    try {
      let result;
      const options = { allowsEditing: true, aspect: [9, 16], quality: 1 };
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Camera access is required.");
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Gallery access is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      if (!result.canceled && result.assets) {
        await createStory({
          userId: auth.currentUser.uid,
          username: 'Your story',
          userPhoto: auth.currentUser.photoURL,
          mediaUrl: result.assets[0].uri,
        });
        const updated = await getActiveStories();
        setStories(updated);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to process media.");
    }
  };

  const handleStoryPress = (isMine, hasMyStory) => {
    if (isMine && hasMyStory) {
      navigation.navigate('StoryScreen', { userId: auth.currentUser.uid });
    } else {
      Alert.alert("Post Story", "Choose media source:", [
        { text: "Camera", onPress: () => launchPicker('camera') },
        { text: "Gallery", onPress: () => launchPicker('gallery') },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  const renderStory = ({ item, index }) => {
    const isMine = index === 0;
    const hasMyStory = stories.some(s => s.userId === auth.currentUser.uid);
    const displayAvatar = isMine ? (auth.currentUser?.photoURL) : item.userPhoto;

    return (
      <View style={styles.storyContainer}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => handleStoryPress(isMine, hasMyStory)}
          onLongPress={() => handleStoryPress(true, false)}
        >
          <View style={[styles.storyRing, !isMine && stories.some(s => s.userId === item.userId) && styles.activeStoryRing, isMine && hasMyStory && styles.activeStoryRing]}>
            <Image source={{ uri: displayAvatar }} style={styles.storyAvatar} cachePolicy="disk" />
          </View>
        </TouchableOpacity>
        
        {isMine && (
          <TouchableOpacity style={styles.addStoryBadge} onPress={() => handleStoryPress(true, false)}>
            <Ionicons name="add" size={14} color="#ffffff" />
          </TouchableOpacity>
        )}

        <Text style={styles.storyUsername} numberOfLines={1}>{isMine ? 'Your story' : item.username}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.headerSection}>
            <View style={styles.mainHeader}>
              <View style={styles.logoContainer}>
                <MaterialIcons name="bubble-chart" size={24} color="#a855f7" />
                <Text style={styles.logoText}>ANIMAVIBE</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('InboxScreen')}>
                  <Feather name="send" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={[{ id: 'me' }, ...stories.filter(s => s.userId !== auth.currentUser.uid)]}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={renderStory}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.storiesList}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerSection: { borderBottomWidth: 1, borderBottomColor: '#111111', marginBottom: 16 },
  mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginLeft: 4 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 20 },
  storiesList: { paddingHorizontal: 16 },
  storyContainer: { alignItems: 'center', marginRight: 20, width: 70, position: 'relative' },
  storyRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  activeStoryRing: { borderColor: '#a855f7' },
  storyAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a1a1a' },
  addStoryBadge: { position: 'absolute', bottom: 25, right: 5, backgroundColor: '#0095f6', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000', zIndex: 1 },
  storyUsername: { color: '#ffffff', fontSize: 11, marginTop: 8, textAlign: 'center' }
});