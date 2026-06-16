import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native'
import { db, auth } from '../config/firebase'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currentUser = auth.currentUser

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      if (!currentUser) {
        setIsLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setDisplayName(data.displayName || currentUser.displayName || 'No Name')
          setBio(data.bio || 'No bio yet.')
          setStats({
            posts: data.postsCount || 0,
            followers: data.followersCount || 0,
            following: data.followingCount || 0
          })
        } else {
          setDisplayName(currentUser.displayName || 'No Name')
          setBio('No bio yet.')
        }

        const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUser.uid))
        const postsSnapshot = await getDocs(postsQuery)
        
        setStats(prev => ({
          ...prev,
          posts: postsSnapshot.size
        }))

      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileAndStats()
  }, [currentUser])

  const handleSave = async () => {
    if (!currentUser) return
    setIsSaving(true)
    try {
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim()
      })
      setIsEditing(false)
      Alert.alert('Sukses', 'Profil kamu berhasil diperbarui!')
    } catch (error) {
      Alert.alert('Gagal', error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleForceLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      Alert.alert('Error', 'Gagal memicu sistem login: ' + error.message)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    )
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.guestContainer}>
          <View style={styles.avatarPlaceholderEmpty} />
          <Text style={styles.guestDesc}>
            Kamu harus masuk ke akun kamu terlebih dahulu untuk melihat, mengubah, dan mempersonalisasikan halaman profil sosial mediamu.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={handleForceLogout}>
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
          <View style={styles.avatarPlaceholder} />
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
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.username}>@{currentUser?.email?.split('@')[0]}</Text>
            <Text style={styles.bio}>{bio}</Text>
          </View>
        )}

        {isEditing ? (
          <TouchableOpacity style={[styles.editBtn, styles.saveBtn]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.editBtnText}>Save Profile</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={Array(stats.posts).fill(null)}
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
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#222', borderWidth: 2, borderColor: '#fff' },
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
  editBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  saveBtn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  editBtnText: { color: '#fff', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 16 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 4 },
  grid: { marginTop: 16 },
  gridItem: { flex: 1, aspectRatio: 1, backgroundColor: '#111', margin: 2, borderRadius: 4 }
})