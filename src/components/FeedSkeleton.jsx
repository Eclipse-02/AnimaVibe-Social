import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MotiView } from 'moti'

export default function FeedSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.8 }}
          transition={{ loop: true, duration: 800, type: 'timing' }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.8 }}
            transition={{ loop: true, duration: 800, type: 'timing' }}
            style={styles.username}
          />
        </View>
      </View>
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.6 }}
        transition={{ loop: true, duration: 800, type: 'timing' }}
        style={styles.image}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#121212',
    marginBottom: 16,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
  },
  headerText: {
    marginLeft: 12,
  },
  username: {
    height: 14,
    width: 120,
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#222222',
    borderRadius: 8,
  },
})