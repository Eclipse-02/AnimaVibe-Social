import React from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 2;

const MOCK_DATA = [
  { id: '1', type: 'wide', uri: 'https://picsum.photos/400/300' },
  { id: '2', type: 'tall', uri: 'https://picsum.photos/300/600' },
  { id: '3', type: 'square', uri: 'https://picsum.photos/300/300' },
  { id: '4', type: 'square', uri: 'https://picsum.photos/300/300' },
  { id: '5', type: 'wide', uri: 'https://picsum.photos/400/300' },
  { id: '6', type: 'tall', uri: 'https://picsum.photos/300/600' },
  { id: '7', type: 'square', uri: 'https://picsum.photos/300/300' },
];

export default function DiscoveryScreen() {
  const navigation = useNavigation();

  const renderItem = ({ item }) => {
    const height = item.type === 'tall' ? 250 : 150;
    return (
      <View style={[styles.imageWrapper, { height }]}>
        <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity 
        style={styles.searchContainer} 
        onPress={() => navigation.navigate('SearchResults')}
      >
        <Ionicons name="search" size={20} color="#888" />
        <Text style={styles.searchText}>Search users, posts, tags...</Text>
      </TouchableOpacity>

      <View style={styles.trendingContainer}>
        <Text style={styles.trendingTitle}>TRENDING</Text>
        <View style={styles.tagRow}>
          {['#photography', '#design', '#travel', '#architecture'].map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={MOCK_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', margin: 16, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  searchText: { color: '#666', marginLeft: 10, fontSize: 14 },
  trendingContainer: { paddingHorizontal: 16, marginBottom: 16 },
  trendingTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  tagRow: { flexDirection: 'row' },
  tag: { backgroundColor: '#161616', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  tagText: { color: '#fff', fontSize: 12 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 },
  imageWrapper: { width: columnWidth, marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
  image: { flex: 1 }
});