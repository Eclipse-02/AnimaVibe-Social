import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import Animated, { useSharedValue, withTiming, Easing, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { getActiveStories } from '../services/stories';

const { width } = Dimensions.get('window');

export default function StoryScreen({ navigation, route }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getActiveStories();
        const userIdFilter = route?.params?.userId;
        const filtered = userIdFilter ? data.filter(s => s.userId === userIdFilter) : data;
        setStories(filtered);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, [route?.params?.userId]);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 5000, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(handleNext)();
    });
  }, [currentIndex, stories]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
    else navigation.goBack();
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleDelete = async (storyId) => {
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      Alert.alert("Success", "Story berhasil dihapus");
      navigation.goBack();
    } catch (e) { Alert.alert("Error", "Gagal menghapus story"); }
  };

  const handleArchive = async (storyId) => {
    try {
      await updateDoc(doc(db, 'stories', storyId), { archived: true });
      Alert.alert("Success", "Story berhasil diarsipkan");
      navigation.goBack();
    } catch (e) { Alert.alert("Error", "Gagal mengarsipkan story"); }
  };

  const showOptions = (storyId) => {
    Alert.alert("Story Options", "Pilih tindakan:", [
      { text: "Hapus Story", style: "destructive", onPress: () => handleDelete(storyId) },
      { text: "Arsip Story", onPress: () => handleArchive(storyId) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>;
  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBg}>
            <ProgressBarItem index={index} currentIndex={currentIndex} progress={progress} />
          </View>
        ))}
      </View>

      <GestureDetector gesture={Gesture.Tap().onEnd((e) => e.x < width / 2 ? runOnJS(handlePrev)() : runOnJS(handleNext)())}>
        <View style={styles.content}>
          <Image source={{ uri: currentStory.mediaUrl }} style={styles.storyImage} contentFit="cover" />
          <View style={styles.overlay}>
            <View style={styles.header}>
              <Image source={{ uri: currentStory.userPhoto }} style={styles.avatar} />
              <Text style={styles.username}>{currentStory.username}</Text>
              {currentStory.userId === auth.currentUser.uid && (
                <TouchableOpacity onPress={() => showOptions(currentStory.id)} style={styles.menuBtn}>
                  <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                <Feather name="x" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.footer}>
               <Text style={styles.viewers}>Dilihat oleh 24 orang</Text>
            </View>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

function ProgressBarItem({ index, currentIndex, progress }) {
  const animatedStyle = useAnimatedStyle(() => {
    let widthVal = '0%';
    if (index < currentIndex) widthVal = '100%';
    else if (index === currentIndex) widthVal = (progress.value * 100) + '%';
    return { width: widthVal };
  });
  return <Animated.View style={[styles.progressBarFill, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  progressContainer: { flexDirection: 'row', position: 'absolute', top: 50, left: 10, right: 10, height: 4, zIndex: 10 },
  progressBarBg: { flex: 1, height: 4, backgroundColor: '#555', marginHorizontal: 2, borderRadius: 2 },
  progressBarFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  content: { flex: 1 },
  storyImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 60 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  username: { color: '#fff', marginLeft: 10, fontWeight: 'bold' },
  menuBtn: { marginLeft: 'auto', marginRight: 15 },
  closeBtn: { marginLeft: 0 },
  footer: { position: 'absolute', bottom: 30, left: 20 },
  viewers: { color: '#aaa', fontSize: 12 }
});