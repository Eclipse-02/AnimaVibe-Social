import React, { useEffect, useState, memo } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/useAuthStore'
import { db } from '../config/firebase'
import { doc, updateDoc } from 'firebase/firestore'

function ProfileScreen({ navigation }) {
  const { logout } = useAuth()
  
  // Selector granular sesuai standar performa tim
  const userProfile = useAuthStore((state) => state.userProfile)
  const isAuthLoading = useAuthStore((state) => state.isLoading)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '')
      setBio(userProfile.bio || '')
    }
  }, [userProfile])

  const handleSave = async () => {
    if (!userProfile?.uid) return
    setIsSaving(true)
    try {
      const userRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim()
      })
      
      // Sinkronisasi local state store jika dibutuhkan tim
      if (useAuthStore.getState().setUserProfile) {
        useAuthStore.getState().setUserProfile({
          ...userProfile,
          displayName: displayName.trim(),
          bio: bio.trim()
        })
      }

      setIsEditing(false)
      Alert.alert('Sukses', 'Profil kamu berhasil diperbarui!')
    } catch (error) {
      Alert.alert('Gagal', error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Logout gagal:', err)
    }
  }

  const handleLoginNavigation = () => {
    try {
      navigation.navigate('login')
    } catch (e) {
      try {
        navigation.navigate('Auth')
      } catch (err) {
        Alert.alert('Navigasi', 'Silakan buka tab login pada menu utama.')
      }
    }
  }

  const getInitial = () => {
    if (userProfile?.displayName) return userProfile.displayName.charAt(0).toUpperCase()
    if (userProfile?.email) return userProfile.email.charAt(0).toUpperCase()
    return '?'
  }

  if (isAuthLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    )
  }

  // Render Layar Pemblokiran jika User Belum Login
  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.guestContainer}>
          <View style={styles.avatarPlaceholderEmpty} />
          <Text style={styles.guestDesc}>
            Kamu harus masuk ke akun kamu terlebih dahulu untuk melihat, mengubah, dan mempersonalisasikan halaman profil sosial mediamu.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={handleLoginNavigation}>
            <Text style={styles.loginBtnText}>Login Sekarang</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const renderHeader = () => (
    <View>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{getInitial()}</Text>
          </View>
        </View>
        
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Nama Tampilan"
              placeholderTextColor="#555555"
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tulis bio kamu..."
              placeholderTextColor="#555555"
              multiline
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.name}>{displayName || 'User'}</Text>
            <Text style={styles.username}>@{userProfile?.email?.split('@')[0]}</Text>
            <Text style={styles.bio}>{bio || 'Connect with your inner vibe'}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {isEditing ? (
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.actionBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditing(true)}>
              <Text style={styles.actionBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
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
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={Array(userProfile?.postsCount ?? 0).fill(null)}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        renderItem={() => <View style={styles.gridItem} />}
        keyExtractor={(_, index) => index.toString()}
        style={styles.grid}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000', 
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0 
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  guestContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%'
  },
  avatarPlaceholderEmpty: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 24
  },
  guestDesc: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10
  },
  loginBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center'
  },
  loginBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold'
  },
  profileHeader: { alignItems: 'center', marginTop: 10 },
  avatarContainer: { marginBottom: 4 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#222', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  username: { color: '#666', fontSize: 14, marginTop: 2 },
  bio: { color: '#aaa', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  editForm: {
    width: '100%',
    marginTop: 12
  },
  input: {
    backgroundColor: '#111',
    color: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
    fontSize: 14
  },
  bioInput: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8
  },
  buttonGroup: {
    width: '100%',
    marginTop: 16,
    gap: 8
  },
  actionBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: '100%', padding: 12, borderRadius: 10, alignItems: 'center' },
  saveBtn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#1a0d0d', borderWidth: 1, borderColor: '#5c1d1d', width: '100%', padding: 12, borderRadius: 10, alignItems: 'center' },
  logoutBtnText: { color: '#ff4444', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 16 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 4 },
  grid: { marginTop: 16 },
  gridItem: { flex: 1, aspectRatio: 1, backgroundColor: '#111', margin: 2, borderRadius: 4 }
})

export default memo(ProfileScreen);