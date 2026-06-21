import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Switch, Keyboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import { storage } from '../../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { serverTimestamp } from 'firebase/firestore'
import { createPost } from '../../lib/firestore/posts'
import { useAuthStore } from '../../store/authStore'
import { useThemeColors } from '../../hooks/useTheme'

export default function CreatePostScreen({ navigation }) {
  const user = useAuthStore((state) => state.user)
  const userProfile = useAuthStore((state) => state.userProfile)
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fbSwitch, setFbSwitch] = useState(false)
  const [twitterSwitch, setTwitterSwitch] = useState(false)
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])

  const selectImageSource = () => {
    Alert.alert(
      'Select Photo',
      'Where do you want to take the photo from?',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'The application needs camera access to take photos!')
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
      Alert.alert('Permission Denied', 'The application needs gallery access to take photos!')
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
      Alert.alert('Warning', 'You must select an image first!')
      return
    }

    if (!user?.uid) {
      Alert.alert('Access Denied', 'You must be logged in to create a post.')
      return
    }

    setIsSubmitting(true)
    Keyboard.dismiss()

    try {
      const downloadUrl = await uploadImageAsync(image)

      await createPost({
        userId: user.uid,
        username: userProfile?.username || user.displayName,
        userPhoto: userProfile?.photoURL || user.photoURL,
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

      Alert.alert('Success', 'Your post has been shared successfully!', [
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
      Alert.alert('Failed', 'An error occurred: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCaptionWithHashtags = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#') && word.trim().length > 1) {
        return <Text key={index} style={{ color: colors.brand }}>{word}</Text>;
      }
      return <Text key={index} style={{ color: colors.text }}>{word}</Text>;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.shareBtnTop, isSubmitting && styles.disabledBtnTop]}
          onPress={handleShare}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background} />
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
                <Feather name="image" size={40} color={colors.textSecondary} />
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
            <Feather name="sliders" size={20} color={colors.text} style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarItem}>
            <Feather name="edit-2" size={20} color={colors.text} style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarItem}>
            <Feather name="layers" size={20} color={colors.text} style={styles.toolbarIcon} />
            <Text style={styles.toolbarText}>Presets</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.captionSection}>
          <Text style={styles.sectionLabel}>Caption</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={280}
              onChangeText={setCaption}
              editable={!isSubmitting}
            >
              {caption ? renderCaptionWithHashtags(caption) : null}
            </TextInput>
          </View>
        </View>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="user-plus" size={20} color={colors.text} style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Tag People</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="map-pin" size={20} color={colors.text} style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Add Location</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Feather name="settings" size={20} color={colors.text} style={styles.settingRowIcon} />
              <Text style={styles.settingText}>Advanced Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.crosspostContainer}>
          <View style={styles.crosspostHeader}>
            <Feather name="share-2" size={16} color={colors.text} style={styles.crosspostHeaderIcon} />
            <Text style={styles.crosspostTitle}>Cross-post to other platforms</Text>
          </View>

          <View style={styles.switchRowContainer}>
            <View style={styles.switchItem}>
              <Switch
                trackColor={{ false: colors.surface, true: colors.text }}
                thumbColor={fbSwitch ? colors.background : colors.textSecondary}
                onValueChange={() => setFbSwitch(!fbSwitch)}
                value={fbSwitch}
              />
              <Text style={styles.switchLabel}>Facebook</Text>
            </View>

            <View style={styles.switchItem}>
              <Switch
                trackColor={{ false: colors.surface, true: colors.text }}
                thumbColor={twitterSwitch ? colors.background : colors.textSecondary}
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

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  warningText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerLeft: { width: 60 },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'
  },
  shareBtnTop: {
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    width: 70,
    alignItems: 'center'
  },
  disabledBtnTop: {
    backgroundColor: colors.textSecondary
  },
  shareTextTop: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold'
  },
  scrollContainer: {
    paddingBottom: 40
  },
  imageSection: {
    padding: 16,
    paddingBottom: 0
  },
  uploadBox: {
    height: 320,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  uploadPlaceholderContainer: {
    alignItems: 'center'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  aspectRatioPill: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  aspectIconActive: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16
  },
  aspectIcon: {
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  aspectTextActive: {
    color: colors.text,
    fontSize: 16
  },
  aspectText: {
    color: colors.textSecondary,
    fontSize: 16
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: 16
  },
  toolbarItem: {
    alignItems: 'center'
  },
  toolbarIcon: {
    marginBottom: 4
  },
  toolbarText: {
    color: colors.textSecondary,
    fontSize: 12
  },
  captionSection: {
    padding: 16
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surfaceHigh
  },
  input: {
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  settingsList: {
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingRowIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center'
  },
  settingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  crosspostContainer: {
    margin: 16,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  crosspostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  crosspostHeaderIcon: {
    marginRight: 8
  },
  crosspostTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600'
  },
  switchRowContainer: {
    flexDirection: 'row',
    gap: 24
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  switchLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.textSecondary
  }
})