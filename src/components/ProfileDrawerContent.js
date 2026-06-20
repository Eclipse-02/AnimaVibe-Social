import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfileDrawerContent({ navigation }) {
  const { logout } = useAuth();
  const isLoading = useAuthStore((state) => state.isLoading);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleEditProfile = () => {
    navigation.closeDrawer();
    navigation.navigate('Profile', { openEdit: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={22} color="#ffffff" />
          <Text style={styles.menuItemText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ff4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color="#ff4444" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingTop: 20 },
  menuSection: { paddingHorizontal: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111111' },
  menuItemText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  logoutText: { color: '#ff4444' },
});