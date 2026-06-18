import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Platform, StatusBar, ScrollView, Alert, ActivityIndicator, Switch, Keyboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import { storage } from '../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { serverTimestamp } from 'firebase/firestore'
import { createPost } from '../services/posts'
import { useAuthStore } from '../store/useAuthStore'

export default function CreatePostScreen({ navigation }) {
  const user = useAuthStore((state) => state.user)
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fbSwitch, setFbSwitch] = useState(false)
  const [twitterSwitch, setTwitterSwitch] = useState(false)

  const selectImageSource = () => {
    Alert.alert(
      'Pilih Foto',
      'Dari mana kamu ingin mengambil foto?',
      [
        { text: 'Kamera', onPress: takePhoto },
        { text: 'Galeri', onPress: pickImage },
        { text: 'Batal', style: 'cancel' }
      ]
    )
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses kamera untuk mengambil foto!')
      return
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses galeri untuk mengupload foto!')
      return
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri)
    const blob = await response.blob()
    const filename = `posts/${user?.uid || 'anonymous'}_${Date.now()}.jpg`
    const storageRef = ref(storage, filename)
    
    await uploadBytes(storageRef, blob)
    return await getDownloadURL(storageRef)
  }

  const handleShare = async () => {
    if (!image) {
      Alert.alert('Peringatan', 'Kamu wajib memilih gambar terlebih dahulu!')
      return
    }

    if (!user?.uid) {
      Alert.alert('Akses Ditolak', 'Kamu harus login untuk membuat postingan.')
      return
    }

    setIsSubmitting(true)
    Keyboard.dismiss()

    try {
      const downloadUrl = await uploadImageAsync(image)
      
      await createPost({
        userId: user.uid,
        username: user.username || user.displayName || 'User',
        userPhoto: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        imageUrl: downloadUrl,
        caption: caption.trim(),
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      })

      setCaption('')
      setImage(null)
      setFbSwitch(false)
      setTwitterSwitch(false)
      
      Alert.alert('Sukses', 'Postingan kamu berhasil dibagikan!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack()
            }
          }
        }
      ])
    } catch (error) {
      console.error(error)
      Alert.alert('Gagal', 'Terjadi kesalahan: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.warningText}>
          Silakan masuk ke akun kamu terlebih dahulu untuk membagikan postingan baru.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Feather name="x" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity 
          style={[styles.shareBtnTop, isSubmitting && styles.disabledBtnTop]} 
          onPress={handleShare}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.shareTextTop}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.uploadBox} onPress={selectImageSource} disabled={isSubmitting}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholderContainer}>
                <Feather name="image" size={40} color="#666666" />
              </View>
            )}
            {!image && (
              <View style={styles.aspectRatioPill}>
                <View style={styles.aspectIconActive}><Text style={styles.aspectTextActive}>□</Text></View>
                <View style={styles.aspectIcon}><Text style={styles.aspectText}>▯</Text></View>
                <View style={styles.aspectIcon}><Text style={styles.aspectText}>▭</Text></View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarItem}>
            <Feather name="sliders" size={20} color="#ffffff" style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarItem}>
            <Feather name="edit-2" size={20} color="#ffffff" style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarItem}>
            <Feather name="layers" size={20} color="#ffffff" style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Presets</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.captionSection}>
          <Text style={styles.sectionLabel}>Caption</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Write a caption..."
              placeholderTextColor="#666666"
              multiline
              maxLength={280}
              value={caption}
              onChangeText={setCaption}
              editable={!isSubmitting}
            />
          </View>
        </View>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="user-plus" size={20} color="#ffffff" style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Tag People</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="map-pin" size={20} color="#ffffff" style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Add Location</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="settings" size={20} color="#ffffff" style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Advanced Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.crosspostContainer}>
          <View style={styles.crosspostHeader}>
            <Feather name="share-2" size={16} color="#ffffff" style={styles.crosspostHeaderIcon} />
            <Text style={styles.crosspostTitle}>Cross-post to other platforms</Text>
          </View>
          
          <View style={styles.switchRowContainer}>
            <View style={styles.switchItem}>
              <Switch
                trackColor={{ false: '#333333', true: '#ffffff' }}
                thumbColor={fbSwitch ? '#000000' : '#888888'}
                onValueChange={() => setFbSwitch(!fbSwitch)}
                value={fbSwitch}
              />
              <Text style={styles.switchLabel}>Facebook</Text>
            </View>
            
            <View style={styles.switchItem}>
              <Switch
                trackColor={{ false: '#333333', true: '#ffffff' }}
                thumbColor={twitterSwitch ? '#000000' : '#888888'}
                onValueChange={() => setTwitterSwitch(!twitterSwitch)}
                value={twitterSwitch}
              />
              <Text style={styles.switchLabel}>Twitter</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  warningText: { color: '#ffffff', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111111' },
  headerLeft: { width: 60 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  shareBtnTop: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, width: 70, alignItems: 'center' },
  disabledBtnTop: { backgroundColor: '#555555' },
  shareTextTop: { color: '#000000', fontSize: 14, fontWeight: 'bold' },
  scrollContainer: { paddingBottom: 40 },
  imageSection: { padding: 16, paddingBottom: 0 },
  uploadBox: { height: 320, backgroundColor: '#111111', borderRadius: 8, borderWidth: 1, borderColor: '#333333', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  uploadPlaceholderContainer: { alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  aspectRatioPill: { position: 'absolute', bottom: 16, flexDirection: 'row', backgroundColor: '#000000', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#333333' },
  aspectIconActive: { backgroundColor: '#333333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  aspectIcon: { paddingHorizontal: 12, paddingVertical: 4 },
  aspectTextActive: { color: '#ffffff', fontSize: 16 },
  aspectText: { color: '#aaaaaa', fontSize: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111111', marginHorizontal: 16 },
  toolbarItem: { alignItems: 'center' },
  toolbarIcon: { marginBottom: 4 },
  toolbarText: { color: '#aaaaaa', fontSize: 12 },
  captionSection: { padding: 16 },
  sectionLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: { borderWidth: 1, borderColor: '#333333', borderRadius: 8, padding: 12, backgroundColor: '#111111' },
  input: { color: '#ffffff', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  settingsList: { paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#111111' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111111' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowIcon: { marginRight: 12, width: 24, textAlign: 'center' },
  settingText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  crosspostContainer: { margin: 16, backgroundColor: '#111111', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#333333' },
  crosspostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  crosspostHeaderIcon: { marginRight: 8 },
  crosspostTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  switchRowContainer: { flexDirection: 'row', gap: 24 },
  switchItem: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { marginLeft: 8, fontSize: 12, color: '#aaaaaa' }
})