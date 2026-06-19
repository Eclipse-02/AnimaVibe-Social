import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native'
import { Image } from 'expo-image'
import { auth } from '../config/firebase'
import { addComment, getComments } from '../services/comments'

export default function CommentsScreen({ route }) {
  const { postId } = route.params
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getComments(postId)
        setComments(data.comments)
      } catch (error) {
        console.error(error)
      }
    }
    fetchComments()
  }, [postId])

  const handlePost = async () => {
    if (!comment.trim()) return
    try {
      await addComment(postId, {
        userId: auth.currentUser?.uid,
        username: auth.currentUser?.displayName || 'User',
        userPhoto: auth.currentUser?.photoURL || '',
        text: comment
      })
      setComment('')
      const data = await getComments(postId)
      setComments(data.comments)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => (
          <View style={styles.commentBubble}>
            <Image source={{ uri: item.userPhoto }} style={styles.avatar} />
            <View style={styles.content}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          </View>
        )}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputWrapper}>
          <Image source={{ uri: auth.currentUser?.photoURL }} style={styles.smallAvatar} />
          <TextInput 
            style={styles.input} 
            placeholder="Add a comment..." 
            placeholderTextColor="#666" 
            value={comment} 
            onChangeText={setComment} 
          />
          <TouchableOpacity onPress={handlePost}>
            <Text style={styles.postBtn}>Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  listPadding: { padding: 16 },
  commentBubble: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 16, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  content: { marginLeft: 12, flex: 1 },
  username: { color: '#ffffff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  text: { color: '#cccccc', fontSize: 14 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#222', backgroundColor: '#0f0f0f' },
  input: { flex: 1, color: '#fff', backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 14 },
  postBtn: { color: '#8b5cf6', marginLeft: 12, fontWeight: 'bold' }
})