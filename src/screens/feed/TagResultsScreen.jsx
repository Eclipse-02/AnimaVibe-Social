import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

export default function TagResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tag } = route.params || { tag: 'Tag' };

  const MOCK_TAG_DATA = [
    { id: '1', uri: 'https://picsum.photos/500/500' },
    { id: '2', uri: 'https://picsum.photos/500/600' },
    { id: '3', uri: 'https://picsum.photos/600/500' },
    { id: '4', uri: 'https://picsum.photos/400/400' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{tag}</Text>
      </View>

      <FlatList
        data={MOCK_TAG_DATA}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222'
  },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 16 },
  imageWrapper: { 
    flex: 1, 
    height: 200, 
    margin: 4, 
    borderRadius: 8, 
    overflow: 'hidden' 
  },
  image: { flex: 1 }
});