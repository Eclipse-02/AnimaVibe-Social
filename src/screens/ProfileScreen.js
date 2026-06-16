import React, { memo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';

function ProfileScreen() {
  const { logout } = useAuth();
  
  // Selector granular for state values from useAuthStore
  const userProfile = useAuthStore((state) => state.userProfile);
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Helper to get initials
  const getInitial = () => {
    if (userProfile?.displayName) return userProfile.displayName.charAt(0).toUpperCase();
    if (userProfile?.email) return userProfile.email.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{getInitial()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{userProfile?.displayName || 'User'}</Text>
        <Text style={styles.bio}>{userProfile?.bio || 'Connect with your inner vibe'}</Text>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ff4444" />
          ) : (
            <Text style={styles.logoutBtnText}>Log Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userProfile?.postsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {userProfile?.followersCount ?? (userProfile?.followers?.length ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {userProfile?.followingCount ?? (userProfile?.following?.length ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  profileHeader: { alignItems: 'center', marginTop: 20 },
  avatarContainer: { marginBottom: 16 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#333', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#fff' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  bio: { color: '#666', fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  editBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: '80%', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  editBtnText: { color: '#fff', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#1a0d0d', borderWidth: 1, borderColor: '#5c1d1d', width: '80%', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12, height: 40, justifyContent: 'center' },
  logoutBtnText: { color: '#ff4444', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 12 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 2 }
});

export default memo(ProfileScreen);