import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';

export default function ProfileDrawerContent({ navigation }) {
  const { logout } = useAuth();
  const isLoading = useAuthStore((state) => state.isLoading);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { theme, setTheme } = useThemeStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleEditProfile = () => {
    navigation.closeDrawer();
    navigation.navigate('EditProfile');
  };

  const handleFavorites = () => {
    navigation.closeDrawer();
    navigation.navigate('PostGrid', { type: 'favorites', title: 'Favorites' });
  };

  const handleBookmarks = () => {
    navigation.closeDrawer();
    navigation.navigate('PostGrid', { type: 'bookmarks', title: 'Bookmarks' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.headerTitle}>Settings</Text>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={handleFavorites}>
          <Ionicons name="heart-outline" size={22} color={colors.text} />
          <Text style={styles.menuItemText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleBookmarks}>
          <Ionicons name="bookmark-outline" size={22} color={colors.text} />
          <Text style={styles.menuItemText}>Bookmarks</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={22} color={colors.text} />
          <Text style={styles.menuItemText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.themeSection}>
          <Text style={styles.themeTitle}>Theme</Text>
          <View style={styles.themeOptions}>
            {['system', 'light', 'dark'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.themeBtn, theme === t && styles.themeBtnActive]}
                onPress={() => setTheme(t)}
              >
                <Text style={[styles.themeBtnText, theme === t && styles.themeBtnTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.footer]}>
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuSection: { flex: 1, paddingHorizontal: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12
  },
  themeSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  themeTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  themeBtnActive: {
    backgroundColor: colors.text,
    borderColor: colors.text
  },
  themeBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  themeBtnTextActive: {
    color: colors.background,
    fontWeight: 'bold'
  },
  footer: {
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutText: { color: colors.danger },
});
