import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStory } from '../../lib/firestore/stories';
import { useThemeColors } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 2;
const ITEM_WIDTH = (width - (COLUMN_COUNT - 1) * SPACING) / COLUMN_COUNT;

export default function CreateStoryScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        loadPhotos();
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const loadPhotos = async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 30,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setPhotos(assets);
    } catch (error) {
      console.error('Failed to load media', error);
    } finally {
      setLoading(false);
    }
  };

  const postStory = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
    if (!selectedImage) return;

    setIsPosting(true);
    try {
      await createStory({
        userId: user.uid,
        username: userProfile?.username || user.displayName || 'User',
        userPhoto: userProfile?.photoURL || user.photoURL,
        mediaUrl: selectedImage,
        caption: caption.trim(),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to post story.');
      setIsPosting(false);
    }
  };

  const handleCameraPress = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to launch camera.');
    }
  };

  const handleSelectImage = (asset) => {
    setSelectedImage(asset.uri);
  };

  const renderGridItem = ({ item, index }) => {
    if (index === 0) {
      return (
        <TouchableOpacity style={[styles.gridItem, styles.cameraButton]} onPress={handleCameraPress}>
          <Ionicons name="camera" size={32} color={colors.text} />
        </TouchableOpacity>
      );
    }

    const asset = item;
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleSelectImage(asset)}
      >
        <Image
          source={{ uri: asset.uri }}
          style={styles.gridImage}
          cachePolicy="disk"
        />
        {asset.mediaType === 'video' && (
          <Text style={styles.videoDuration}>
            {Math.floor(asset.duration)}s
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const gridData = [{ id: 'camera-button' }, ...photos];

  if (selectedImage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedImage(null); setCaption(''); }} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Story</Text>
          <TouchableOpacity onPress={postStory} style={styles.postButton} disabled={isPosting}>
            {isPosting ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.postButtonText}>Share</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.editContainer}>
          <Image source={{ uri: selectedImage }} style={styles.editPreview} contentFit="contain" />
          <TextInput
            style={[styles.captionInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Write a caption..."
            placeholderTextColor="#888"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={150}
          />
        </View>
        {isPosting && (
          <View style={styles.postingOverlay}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.postingText}>Posting...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to story</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Recents Header */}
      <View style={styles.recentsHeader}>
        <TouchableOpacity style={styles.recentsDropdown}>
          <Text style={styles.recentsText}>Recents</Text>
          <Ionicons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectButton}>
          <Ionicons name="copy-outline" size={16} color={colors.text} />
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : hasPermission ? (
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          renderItem={renderGridItem}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={[styles.recentsText, { textAlign: 'center' }]}>Gallery permission is required.</Text>
        </View>
      )}

      {isPosting && (
        <View style={styles.postingOverlay}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.postingText}>Posting...</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentsDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentsText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectButtonText: {
    color: colors.text,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  gridContainer: {
    paddingBottom: 20,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    marginRight: SPACING,
    marginBottom: SPACING,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  cameraButton: {
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  postingText: {
    color: colors.text,
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  postButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  editContainer: {
    flex: 1,
    padding: 16,
  },
  editPreview: {
    width: '100%',
    height: '60%',
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
