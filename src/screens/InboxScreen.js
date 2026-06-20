import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const DUMMY_CHATS = [
  { id: '1', name: 'Rafa Dev', lastMsg: 'See you there!', photo: 'https://picsum.photos/200' },
  { id: '2', name: 'Andika', lastMsg: 'Check this out!', photo: 'https://picsum.photos/201' },
];

export default function InboxScreen({ navigation }) {
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('FeedMain')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search people..." 
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={DUMMY_CHATS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow} onPress={() => navigation.navigate('ChatScreen', { name: item.name })}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.photo }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#333" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginLeft: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', margin: 16, paddingHorizontal: 12, borderRadius: 12, height: 45 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  onlineDot: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#000' },
  chatInfo: { flex: 1, marginLeft: 16 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lastMsg: { color: '#888', fontSize: 14, marginTop: 2 }
});