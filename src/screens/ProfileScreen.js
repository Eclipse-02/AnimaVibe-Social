import React, { memo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { db, storage } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function ProfileScreen() {
  const { logout } = useAuth();
  const userProfile = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(userProfile?.username || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [avatarUri, setAvatarUri] = useState(userProfile?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses galeri untuk mengubah foto profil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Peringatan', 'Nama pengguna tidak boleh kosong!');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Peringatan', 'Nama tidak boleh kosong!');
      return;
    }

    setIsSaving(true);
    Keyboard.dismiss();

    try {
      let finalDownloadURL = avatarUri;

      if (avatarUri && avatarUri !== userProfile?.photoURL) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const filename = `avatars/${userProfile.uid}_avatar.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob);
        finalDownloadURL = await getDownloadURL(storageRef);
      }

      const userRef = doc(db, 'users', userProfile.uid);
      
      const updatedData = {
        ...userProfile,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: finalDownloadURL
      };

      await setDoc(userRef, updatedData, { merge: true });

      setUser(updatedData);

      setIsEditing(false);
      Alert.alert('Sukses', 'Profil berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      Alert.alert('Gagal', 'Gagal memperbarui profil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitial = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    if (username) return username.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader}>
        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={styles.formTitle}>Edit profil</Text>
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} disabled={isSaving} style={styles.avatarWrapper}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImageLarge} />
                ) : (
                  <View style={[styles.avatarPlaceholderLarge, { backgroundColor: '#333' }]}>
                    <Text style={styles.avatarInitialLarge}>{getInitial()}</Text>
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <Text style={styles.editIconText}>✎</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.sectionLabel}>Foto profil</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Nama pengguna</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama pengguna"
                placeholderTextColor="#666666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Nama</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama"
                placeholderTextColor="#666666"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tulis bio vibe-mu di sini..."
                placeholderTextColor="#666666"
                multiline
                maxLength={80}
                value={bio}
                onChangeText={setBio}
                editable={!isSaving}
              />
              <Text style={styles.charCounter}>{bio.length}/80</Text>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.cancelBtn]} 
                onPress={() => {
                  setUsername(userProfile?.username || '');
                  setDisplayName(userProfile?.displayName || '');
                  setBio(userProfile?.bio || '');
                  setAvatarUri(userProfile?.photoURL || null);
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.saveBtn]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
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
            <Text style={styles.usernameDisplay}>@{userProfile?.username || 'username'}</Text>
            <Text style={styles.bio}>{userProfile?.bio || 'Connect with your inner vibe'}</Text>

            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#ff4444" />
              ) : (
                <Text style={styles.logoutBtnText}>Log Out</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userProfile?.postCount || 0}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userProfile?.followerCount || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userProfile?.followingCount || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  profileHeader: { alignItems: 'center', marginTop: 10, width: '100%' },
  avatarContainer: { marginBottom: 12 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#333', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#fff' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  usernameDisplay: { color: '#888888', fontSize: 14, marginTop: 2 },
  bio: { color: '#aaa', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  editBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: '80%', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  editBtnText: { color: '#fff', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#1a0d0d', borderWidth: 1, borderColor: '#5c1d1d', width: '80%', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12, height: 40, justifyContent: 'center' },
  logoutBtnText: { color: '#ff4444', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 12 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 2 },
  editForm: { width: '100%', paddingHorizontal: 8 },
  formTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'left' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatarImageLarge: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholderLarge: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarInitialLarge: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#222', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  editIconText: { color: '#fff', fontSize: 14 },
  sectionLabel: { color: '#888888', fontSize: 12, marginTop: 8 },
  inputGroup: { width: '100%', marginBottom: 16 },
  fieldLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1c1c1e', color: '#ffffff', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#2c2c2e' },
  bioInput: { height: 70, textAlignVertical: 'top' },
  charCounter: { color: '#666666', fontSize: 12, textAlign: 'right', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#111111', marginRight: 8, borderWidth: 1, borderColor: '#222222' },
  cancelBtnText: { color: '#ffffff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#ffffff', marginLeft: 8 },
  saveBtnText: { color: '#000000', fontWeight: '600' }
});

export default memo(ProfileScreen);