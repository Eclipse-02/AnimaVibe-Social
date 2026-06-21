import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../config/firebase';
import { doc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { followUser, unfollowUser } from '../../lib/firestore/users';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

function mapPostDoc(postDoc) {
  const data = postDoc.data()
  const imageUrl = data.imageUrl || data.image
  const userPhoto = data.userPhoto || data.avatar
  const likesCount = data.likesCount || 0

  return {
    id: postDoc.id,
    ...data,
    image: imageUrl,
    imageUrl,
    avatar: userPhoto,
    userPhoto,
    likesCount,
  }
}

function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  const targetUserId = route.params?.userId || user?.uid || userProfile?.uid;
  const isOwnProfile = targetUserId === (user?.uid || userProfile?.uid);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [displayedProfile, setDisplayedProfile] = useState(isOwnProfile ? userProfile : null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (isOwnProfile) {
      setDisplayedProfile(userProfile);
    }
  }, [userProfile, isOwnProfile]);

  useEffect(() => {
    if (!targetUserId) return;

    let unsubscribeUser = () => { };

    if (!isOwnProfile) {
      const userDocRef = doc(db, 'users', targetUserId);
      unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setDisplayedProfile({ uid: docSnap.id, ...docSnap.data() });
        }
      });
    }

    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(mapPostDoc);
      setUserPosts(fetchedPosts);
      setLoadingPosts(false);
    }, (error) => {
      console.error(error);
      setLoadingPosts(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribePosts();
    };
  }, [targetUserId, isOwnProfile]);

  const isFollowing = userProfile?.following?.includes(targetUserId);

  const handleFollowToggle = async () => {
    if (!user || !targetUserId) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, targetUserId);
        const updatedFollowing = (userProfile.following || []).filter(id => id !== targetUserId);
        setUserProfile({
          ...userProfile,
          following: updatedFollowing,
          followingCount: Math.max(0, (userProfile.followingCount || 0) - 1)
        });
      } else {
        await followUser(user.uid, targetUserId, {
          username: userProfile?.username,
          displayName: user?.displayName,
          photoURL: userProfile?.photoURL || user?.photoURL
        });
        const updatedFollowing = [...(userProfile.following || []), targetUserId];
        setUserProfile({
          ...userProfile,
          following: updatedFollowing,
          followingCount: (userProfile.followingCount || 0) + 1
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const getInitial = () => {
    if (displayedProfile?.displayName || user?.displayName) return (displayedProfile?.displayName || user?.displayName).charAt(0).toUpperCase();
    if (displayedProfile?.username) return displayedProfile.username.charAt(0).toUpperCase();
    return '?';
  };

  const ProfileHeaderComponent = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        {(displayedProfile?.photoURL || (isOwnProfile && user?.photoURL)) ? (
          <Image source={{ uri: displayedProfile?.photoURL || user?.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{getInitial()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{displayedProfile?.displayName || (isOwnProfile && user?.displayName) || 'User'}</Text>
      <Text style={styles.usernameDisplay}>@{displayedProfile?.username || 'username'}</Text>
      <Text style={styles.bio}>{displayedProfile?.bio || 'Connect with your inner vibe'}</Text>

      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={handleFollowToggle}
          disabled={isFollowLoading}
        >
          {isFollowLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.background} />
          ) : (
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{displayedProfile?.followersCount || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{displayedProfile?.followingCount || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
    </View>
  );

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.gridItem}
      onPress={() => {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('FeedTab', {
            screen: 'PostDetail',
            params: { post: item }
          });
        }
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} cachePolicy="disk" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isOwnProfile && (
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
      )}

      {!isOwnProfile && (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
      )}

      <FlatList
        key="profile-grid-3col"
        data={userPosts}
        extraData={{ isFollowing, isFollowLoading, displayedProfile }}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={ProfileHeaderComponent}
        renderItem={renderGridItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loadingPosts && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  menuBtn: {
    alignSelf: 'flex-end',
    padding: 12
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 12
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 16
  },
  avatarContainer: {
    marginBottom: 12
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.text
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold'
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold'
  },
  usernameDisplay: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 8
  },
  statBox: {
    alignItems: 'center'
  },
  statNum: {
    color: colors.text, fontSize: 18, fontWeight: 'bold'
  },
  statLabel: {
    color: colors.textSecondary, fontSize: 12, marginTop: 2
  },
  followBtn: {
    backgroundColor: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginTop: 16,
    minWidth: 120,
    alignItems: 'center'
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textSecondary
  },
  followBtnText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14
  },
  followingBtnText: {
    color: colors.text
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
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14
  },
});

export default memo(ProfileScreen);