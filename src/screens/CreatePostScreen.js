import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Keyboard, Platform, StatusBar } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../store/useAuthStore'
import { db, storage } from '../config/firebase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function CreatePostScreen({ navigation }) {
  const user = useAuthStore((state) => state.user)
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses galeri untuk mengunggah foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  const handleCreatePost = async () => {
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
      const response = await fetch(image)
      const blob = await response.blob()
      const filename = `posts/${user.uid}_${Date.now()}.jpg`
      const storageRef = ref(storage, filename)
      
      await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: user.displayName || 'User',
        imageUrl: downloadURL,
        caption: caption.trim(),
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      })

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        postCount: increment(1)
      })

      Alert.alert('Sukses', 'Postingan kamu berhasil dibagikan!', [
        {
          text: 'OK',
          onPress: () => {
            setCaption('')
            setImage(null)
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
        <Text style={styles.headerTitle}>Buat Post Baru</Text>
        <TouchableOpacity 
          style={[styles.postBtn, (!image || isSubmitting) && styles.disabledPostBtn]} 
          onPress={handleCreatePost}
          disabled={isSubmitting || !image}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.postBtnText}>Bagikan</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.imageSelector} onPress={pickImage} disabled={isSubmitting}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>+ Pilih Foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Tulis caption atau deskripsi vibe-mu di sini..."
          placeholderTextColor="#666666"
          multiline
          maxLength={280}
          value={caption}
          onChangeText={setCaption}
          editable={!isSubmitting}
        />
        <Text style={styles.charCounter}>{caption.length}/280</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#222222',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  postBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80
  },
  disabledPostBtn: {
    backgroundColor: '#333333'
  },
  postBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14
  },
  content: {
    flex: 1,
    padding: 16
  },
  imageSelector: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222222'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: {
    color: '#aaaaaa',
    fontSize: 16,
    fontWeight: '600'
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    textAlignVertical: 'top',
    height: 100,
    lineHeight: 24,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222222'
  },
  charCounter: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4
  },
  warningText: {
    color: '#aaaaaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22
  }
})