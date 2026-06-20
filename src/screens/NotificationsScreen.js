import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const DUMMY_DATA = [
  {
    id: '1',
    title: 'New',
    data: [
      { id: 'n1', actorName: 'rafa_dev', message: 'liked your photo.', time: '2m', type: 'like', actorPhoto: 'https://picsum.photos/200' },
      { id: 'n2', actorName: 'andika', message: 'started following you.', time: '15m', type: 'follow', actorPhoto: 'https://picsum.photos/201' },
    ]
  },
  {
    id: '2',
    title: 'Earlier',
    data: [
      { id: 'e1', actorName: 'maya', message: 'commented on your post.', time: '1h', type: 'comment', actorPhoto: 'https://picsum.photos/202' },
      { id: 'e2', actorName: 'neon_ghost', message: 'liked your photo.', time: '3h', type: 'like', actorPhoto: 'https://picsum.photos/203' },
    ]
  }
];

export default function NotificationsScreen() {
  const renderSection = ({ item }) => (
    <View>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      {item.data.map((notif) => (
        <View key={notif.id} style={styles.notifRow}>
          <Image source={{ uri: notif.actorPhoto }} style={styles.avatar} />
          <View style={styles.content}>
            <Text style={styles.notifText}>
              <Text style={styles.bold}>{notif.actorName}</Text> {notif.message}
            </Text>
            <Text style={styles.notifTime}>{notif.time}</Text>
          </View>
          {notif.type === 'follow' && (
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <FlatList
        data={DUMMY_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', margin: 16 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginVertical: 12, marginLeft: 16 },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20 },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#333333' },
  content: { flex: 1, marginLeft: 12 },
  notifText: { color: '#ffffff', fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: 'bold' },
  notifTime: { color: '#777777', fontSize: 12, marginTop: 4 },
  followBtn: { backgroundColor: '#3b82f6', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6 },
  followText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});