import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { db, storage, auth } from '../config/firebase';
import { doc, setDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

function mapPostDoc(postDoc) {
  const data = postDoc.data()
  const imageUrl = data.imageUrl || data.image || ''
  const userPhoto = data.userPhoto || data.avatar || ''
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

  const [displayedProfile, setDisplayedProfile] = useState(isOwnProfile ? userProfile : null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (isOwnProfile) {
      setDisplayedProfile(userProfile);
    }
  }, [userProfile, isOwnProfile]);

  useEffect(() => {
    if (!targetUserId) return;

    let unsubscribeUser = () => {};

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

  useEffect(() => {
    if (displayedProfile) {
      setUsername(displayedProfile.username || '');
      setDisplayName(displayedProfile.displayName || user?.displayName || '');
      setBio(displayedProfile.bio || '');
      setAvatarUri(displayedProfile.photoURL || user?.photoURL || null);
    }
  }, [displayedProfile, isEditing]);

  useEffect(() => {
    if (route.params?.openEdit && isOwnProfile) {
      setIsEditing(true);
      navigation.setParams({ openEdit: undefined });
    }
  }, [route.params?.openEdit, isOwnProfile]);

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
      const currentUid = userProfile?.uid || user?.uid;
      let finalDownloadURL = userProfile?.photoURL || user?.photoURL || '';

      if (avatarUri && avatarUri !== userProfile?.photoURL && avatarUri !== user?.photoURL) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const filename = `avatars/${currentUid}_avatar.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob);
        finalDownloadURL = await getDownloadURL(storageRef);
      }

      const userRef = doc(db, 'users', currentUid);
      const updatedData = {
        ...userProfile,
        uid: currentUid,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: finalDownloadURL,
        postCount: userProfile?.postCount || 0,
        followerCount: userProfile?.followerCount || 0,
        followingCount: userProfile?.followingCount || 0
      };

      await setDoc(userRef, updatedData, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: finalDownloadURL
        });
      }

      setUserProfile(updatedData);

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

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{userPosts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{displayedProfile?.followerCount || 0}</Text>
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
      {!isEditing && isOwnProfile && (
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {!isEditing && !isOwnProfile && (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {isEditing ? (
        <FlatList
          key="profile-edit-form"
          data={[]}
          renderItem={null}
          ListHeaderComponent={
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
                    if (displayedProfile) {
                      setUsername(displayedProfile.username || '');
                      setDisplayName(displayedProfile.displayName || user?.displayName || '');
                      setBio(displayedProfile.bio || '');
                      setAvatarUri(displayedProfile.photoURL || user?.photoURL || null);
                    }
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
          }
        />
      ) : (
        <FlatList
          key="profile-grid-3col"
          data={userPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={ProfileHeaderComponent}
          renderItem={renderGridItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loadingPosts && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Belum ada postingan</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  menuBtn: { alignSelf: 'flex-end', padding: 12 },
  backBtn: { alignSelf: 'flex-start', padding: 12 },
  profileHeader: { alignItems: 'center', marginTop: 10, width: '100%', paddingHorizontal: 16 },
  avatarContainer: { marginBottom: 12 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#333', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#fff' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  usernameDisplay: { color: '#888888', fontSize: 14, marginTop: 2 },
  bio: { color: '#aaa', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 12, width: '100%', marginBottom: 8 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 2 },
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, padding: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#111' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666666', fontSize: 14 },
  editForm: { width: '100%', paddingHorizontal: 24 },
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