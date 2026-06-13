import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder} />
        </View>
        <Text style={styles.name}>Sultan Muhammad</Text>
        <Text style={styles.bio}>Mobile Developer | Studying BI & Analysis</Text>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}><Text style={styles.statNum}>12</Text><Text style={styles.statLabel}>Posts</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>1.4K</Text><Text style={styles.statLabel}>Followers</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>350</Text><Text style={styles.statLabel}>Following</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  profileHeader: { alignItems: 'center', marginTop: 20 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#333', borderHWidht: 2, borderColor: '#fff' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  bio: { color: '#666', fontSize: 14, marginTop: 4, textAlign: 'center' },
  editBtn: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', width: '80%', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  editBtnText: { color: '#fff', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111', paddingVertical: 12 },
  statBox: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 2 }
});