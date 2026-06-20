import React from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchHeader}>
        <TextInput style={styles.searchInput} placeholder="Search creators, topics..." placeholderTextColor="#777" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, styles.tagActive]}><Text style={styles.tagTextActive}>Trending</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>#Architecture</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>#WebDesign</Text></View>
        </View>

        <Text style={styles.sectionTitle}>People</Text>
        <View style={styles.peopleRow}>
          <Image source={{ uri: 'https://picsum.photos/id/64/200' }} style={styles.avatarDummy} cachePolicy="disk" />
          <View style={styles.peopleInfo}>
            <Text style={styles.peopleName}>Dian Utami</Text>
            <Text style={styles.peopleHandle}>@dianutami • Architect</Text>
          </View>
          <View style={styles.followBtn}><Text style={styles.followBtnText}>Follow</Text></View>
        </View>
        <View style={styles.peopleRow}>
          <Image source={{ uri: 'https://picsum.photos/id/22/200' }} style={styles.avatarDummy} cachePolicy="disk" />
          <View style={styles.peopleInfo}>
            <Text style={styles.peopleName}>Arzza Munabim</Text>
            <Text style={styles.peopleHandle}>@Arzza • Designer</Text>
          </View>
          <View style={styles.followBtn}><Text style={styles.followBtnText}>Follow</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Posts</Text>
        <View style={styles.gridContainer}>
          <Image source={{ uri: 'https://picsum.photos/id/101/400/400' }} style={styles.gridBox} cachePolicy="disk" transition={200} />
          <Image source={{ uri: 'https://picsum.photos/id/102/400/400' }} style={styles.gridBox} cachePolicy="disk" transition={200} />
          <Image source={{ uri: 'https://picsum.photos/id/103/400/400' }} style={styles.gridBox} cachePolicy="disk" transition={200} />
          <Image source={{ uri: 'https://picsum.photos/id/104/400/400' }} style={styles.gridBox} cachePolicy="disk" transition={200} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16
  },
  searchHeader: {
    marginTop: 30,
    marginBottom: 16
  },
  searchInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff'
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    marginRight: 8
  },
  tagActive: {
    backgroundColor: '#3b82f6'
  },
  tagText: {
    color: '#aaaaaa'
  },
  tagTextActive: {
    color: '#ffffff'
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarDummy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333'
  },
  peopleInfo: {
    flex: 1,
    marginLeft: 12
  },
  peopleName: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  peopleHandle: {
    color: '#777777',
    fontSize: 12
  },
  followBtn: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4
  },
  followBtnText: {
    color: '#ffffff',
    fontSize: 12
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gridBox: {
    width: '48%',
    height: 150,
    backgroundColor: '#111111',
    marginBottom: 12,
    borderRadius: 8
  }
})