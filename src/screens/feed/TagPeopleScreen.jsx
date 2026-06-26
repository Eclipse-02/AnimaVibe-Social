import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, Image, Platform, StatusBar } from 'react-native'
import { Feather } from '@expo/vector-icons'

const DUMMY_USERS = [
  { id: '1', name: 'Sultan Muhammad', handle: '@sultan_m', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80' },
  { id: '2', name: 'Goji Satoru', handle: '@goji_s', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80' },
  { id: '3', name: 'Arzza Pratama', handle: '@arzza_p', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&q=80' },
  { id: '4', name: 'Rina Melati', handle: '@rina_m', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80' },
  { id: '5', name: 'Budi Santoso', handle: '@budis', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
]

export default function TagPeopleScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [taggedUsers, setTaggedUsers] = useState([])

  const toggleTag = (userId) => {
    if (taggedUsers.includes(userId)) {
      setTaggedUsers(taggedUsers.filter(id => id !== userId))
    } else {
      setTaggedUsers([...taggedUsers, userId])
    }
  }

  const filteredUsers = DUMMY_USERS.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderItem = ({ item }) => {
    const isTagged = taggedUsers.includes(item.id)

    return (
      <TouchableOpacity style={styles.userRow} onPress={() => toggleTag(item.id)} activeOpacity={0.7}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHandle}>{item.handle}</Text>
        </View>
        <View style={[styles.checkbox, isTagged && styles.checkboxActive]}>
          {isTagged && <Feather name="check" size={14} color="#000000" />}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Feather name="chevron-left" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tag People</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerRight}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#666666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a user..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111111'
  },
  headerLeft: {
    width: 60,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'
  },
  doneText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333333'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111111'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#333333'
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  userHandle: {
    color: '#aaaaaa',
    fontSize: 14
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  }
})