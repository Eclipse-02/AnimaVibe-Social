import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native'

export default function PostCard({ post }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: post.userPhoto }} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>{post.timeAgo}</Text>
        </View>
      </View>

      <Image source={{ uri: post.imageUrl }} style={styles.feedImage} />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>❤️ {post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>💬 {post.commentsCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.boldUser}>{post.username} </Text>
          {post.caption}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222222',
  },
  headerText: {
    marginLeft: 10,
  },
  username: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  time: {
    color: '#777777',
    fontSize: 11,
  },
  feedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  actions: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  btn: {
    marginRight: 16,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
  },
  captionContainer: {
    marginTop: 4,
  },
  caption: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  boldUser: {
    fontWeight: 'bold',
  },
})