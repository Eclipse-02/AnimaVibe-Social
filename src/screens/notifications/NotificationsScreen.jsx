import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuthStore } from '../../store/authStore';
import { listenToNotifications } from '../../lib/firestore/notifications';
import { followUser } from '../../lib/firestore/users';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useThemeColors } from '../../hooks/useTheme';

function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Recently';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = listenToNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleFollowBack = async (actorId) => {
    if (!user?.uid) return;
    try {
      await followUser(user.uid, actorId, {
        username: userProfile?.username,
        userPhoto: userProfile?.photoURL
      });
      const updatedFollowing = [...(userProfile?.following || []), actorId];
      setUserProfile({
        ...userProfile,
        following: updatedFollowing,
        followingCount: (userProfile?.followingCount || 0) + 1
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePressNotif = async (notif) => {
    if (notif.entityType === 'post' && notif.postId) {
      try {
        const postSnap = await getDoc(doc(db, 'posts', notif.postId));
        if (postSnap.exists()) {
          const postData = postSnap.data();
          navigation.navigate('MainApp', {
            screen: 'FeedTab',
            params: {
              screen: 'PostDetail',
              params: {
                post: { id: postSnap.id, ...postData, timeAgo: getTimeAgo(postData.createdAt) }
              }
            }
          });
        }
      } catch (err) { console.error(err) }
    } else if (notif.entityType === 'story' || notif.type === 'new_story') {
      navigation.navigate('StoryScreen', { userId: notif.actorId });
    } else if (notif.type === 'follow') {
      navigation.navigate('ProfileScreen', { userId: notif.actorId });
    }
  };

  const renderItem = ({ item: notif }) => {
    const isFollowingBack = userProfile?.following?.includes(notif.actorId);

    return (
      <TouchableOpacity style={styles.notifRow} onPress={() => handlePressNotif(notif)}>
        <Image source={{ uri: notif.actorPhoto }} style={styles.avatar} />
        <View style={styles.content}>
          <Text style={styles.notifText}>
            <Text style={styles.bold}>{notif.actorName}</Text> {notif.message.replace(notif.actorName, '').trim()}
          </Text>
          <Text style={styles.notifTime}>{getTimeAgo(notif.createdAt)}</Text>
        </View>
        {notif.type === 'follow' && !isFollowingBack && (
          <TouchableOpacity style={styles.followBtn} onPress={() => handleFollowBack(notif.actorId)}>
            <Text style={styles.followText}>Follow Back</Text>
          </TouchableOpacity>
        )}
        {notif.type === 'follow' && isFollowingBack && (
          <View style={styles.followingBtn}>
            <Text style={styles.followingText}>Following</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <FlatList
        data={notifications}
        extraData={userProfile?.following}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>There are no notifications at this time.</Text>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    margin: 16
  },
  loader: {
    marginTop: 50
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: colors.surfaceHigh
  },
  content: {
    flex: 1,
    marginLeft: 12
  },
  notifText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  bold: {
    fontWeight: 'bold'
  },
  notifTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4
  },
  followBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6
  },
  followText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  followingBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold'
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14
  },
});
