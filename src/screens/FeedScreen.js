import React, { useState, useEffect } from 'react'
import { StyleSheet, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeedSkeleton from '../components/FeedSkeleton'
import PostCard from '../components/PostCard'

const DUMMY_DATA = [
  {
    id: '1',
    username: 'sultan_muhammad',
    userPhoto: 'https://picsum.photos/id/64/200',
    imageUrl: 'https://picsum.photos/id/101/600/600',
    likes: '1.452',
    commentsCount: 42,
    caption: 'Moti package is running perfectly for the custom skeleton layout inside this mobile app project.',
    timeAgo: '2 hours ago'
  },
  {
    id: '2',
    username: 'rafa_umar',
    userPhoto: 'https://picsum.photos/id/22/200',
    imageUrl: 'https://picsum.photos/id/201/600/600',
    likes: '892',
    commentsCount: 15,
    caption: 'Sleek and dark user interface mode build inside react native expo environment.',
    timeAgo: '5 hours ago'
  }
]

export default function FeedScreen() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <SafeAreaView style={styles.bg}>
        <FeedSkeleton />
        <FeedSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.bg}>
      <FlatList
        data={DUMMY_DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000000',
  },
})