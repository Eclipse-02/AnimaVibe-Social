import React, { memo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { db, storage, auth } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useTheme';

function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  const [username, setUsername] = useState(userProfile?.username || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [avatarUri, setAvatarUri] = useState(userProfile?.photoURL || user?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const colors = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'The app requires gallery access to change profile photo.');
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
      Alert.alert('Warning', 'Username cannot be empty!');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Warning', 'Name cannot be empty!');
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
      };

      await setDoc(userRef, updatedData, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: finalDownloadURL
        });
      }

      setUserProfile(updatedData);
      setUser({
        ...user,
        displayName: displayName.trim(),
        photoURL: finalDownloadURL
      });

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Failed', 'Failed to update profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitial = () => {
    if (userProfile?.displayName || user?.displayName) return (userProfile?.displayName || user?.displayName).charAt(0).toUpperCase();
    if (userProfile?.username) return userProfile.username.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isSaving}>
        <Ionicons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>

      <FlatList
        key="profile-edit-form"
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.editForm}>
            <Text style={styles.formTitle}>Edit profile</Text>
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} disabled={isSaving} style={styles.avatarWrapper}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImageLarge} />
                ) : (
                  <View style={[styles.avatarPlaceholderLarge, { backgroundColor: colors.surfaceHigh }]}>
                    <Text style={styles.avatarInitialLarge}>{getInitial()}</Text>
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <Text style={styles.editIconText}>✎</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.sectionLabel}>Profile photo</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Write your vibe bio here..."
                placeholderTextColor={colors.textSecondary}
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
                onPress={() => navigation.goBack()}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 12
  },
  editForm: {
    width: '100%', paddingHorizontal: 24, marginTop: 10
  },
  formTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'left'
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatarImageLarge: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  avatarPlaceholderLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInitialLarge: {
    color: colors.text,
    fontSize: 36,
    fontWeight: 'bold'
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surfaceHigh,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  editIconText: {
    color: colors.text,
    fontSize: 14
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  bioInput: {
    height: 70,
    textAlignVertical: 'top'
  },
  charCounter: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: colors.text,
    marginLeft: 8
  },
  saveBtnText: {
    color: colors.background,
    fontWeight: '600'
  }
});

export default memo(EditProfileScreen);
