import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Image, Platform, StatusBar, ScrollView, Alert, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { db, storage, auth } from '../config/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function CreatePostScreen({ navigation }) {
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    const filename = `posts/${auth.currentUser?.uid || 'anonymous'}_${Date.now()}.jpg`
    const storageRef = ref(storage, filename)
    
    await uploadBytes(storageRef, blob)
    return await getDownloadURL(storageRef)
  }

  const handleShare = async () => {
    if (!image) {
      Alert.alert('Error', 'Pilih foto terlebih dahulu sebelum membagikan postingan!')
      return
    }

    setIsSubmitting(true)

    try {
      const downloadUrl = await uploadImageAsync(image)
      
      await addDoc(collection(db, 'posts'), {
        userId: auth.currentUser?.uid || 'anonymous',
        username: auth.currentUser?.displayName || 'Sultan Muhammad',
        avatar: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        image: downloadUrl,
        caption: caption.trim(),
        likesCount: 0,
        commentsCount: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      })

      setCaption('')
      setImage(null)
      
      Alert.alert('Sukses', 'Postingan kamu berhasil dibagikan!', [
        { text: 'OK', onPress: () => navigation.navigate('FeedTab') }
      ])
    } catch (error) {
      Alert.alert('Upload Gagal', error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buat Postingan Baru</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Tulis caption menarik di sini, Sultan..."
            placeholderTextColor="#555555"
            multiline
            maxLength={280}
            value={caption}
            onChangeText={setCaption}
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity style={styles.uploadBox} onPress={pickImage} disabled={isSubmitting}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <Text style={styles.uploadPlaceholder}>+ Tambah Foto</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.shareBtn, isSubmitting && styles.disabledBtn]} 
          onPress={handleShare}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.shareText}>Bagikan Postingan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111111'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  inputContainer: {
    marginTop: 20
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top'
  },
  uploadBox: {
    height: 300,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    overflow: 'hidden'
  },
  uploadPlaceholder: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  shareBtn: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    height: 54,
    justifyContent: 'center'
  },
  shareText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16
  },
  disabledBtn: {
    backgroundColor: '#555555'
  }
})