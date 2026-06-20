import React, { useState, useEffect, useLayoutEffect } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { auth } from '../config/firebase'
import { addComment, getComments } from '../services/comments'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated'

const { height } = Dimensions.get('window')

export default function CommentsScreen({ route, navigation }) {
  const { postId } = route.params
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [modalVisible, setModalVisible] = useState(true)
  
  const translateY = useSharedValue(0)

  const handleClose = () => {
    setModalVisible(false)
    setTimeout(() => navigation.goBack(), 250)
  }

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY
      }
    })
    .onEnd(() => {
      if (translateY.value > 150) {
        runOnJS(handleClose)()
      } else {
        translateY.value = withSpring(0)
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }))

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      presentation: 'transparentModal',
    })
  }, [navigation])

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getComments(postId)
        setComments(data?.comments || [])
      } catch (error) {
        console.error("Error loading comments:", error)
      }
    }
    if (postId) fetchComments()
  }, [postId])

  const handlePost = async () => {
    if (!comment.trim()) return
    
    const newCommentData = {
      userId: auth.currentUser?.uid || 'guest',
      username: auth.currentUser?.displayName || 'Guest',
      text: comment,
      userPhoto: auth.currentUser?.photoURL || 'https://i.pravatar.cc/100',
    }

    setComments(prev => [{ id: Date.now().toString(), ...newCommentData }, ...prev])
    setComment('')

    try {
      await addComment(postId, newCommentData)
    } catch (error) {
      console.error("Failed to sync comment:", error)
      setComments(prev => prev.filter(c => c.text !== comment))
    }
  }

  return (
    <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.sheetContainer, animatedStyle]}>
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
                <Text style={styles.headerTitle}>Comments</Text>
              </View>

              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Image source={{ uri: item.userPhoto }} style={styles.avatar} />
                    <View style={styles.content}>
                      <Text style={styles.commentText}>
                        <Text style={styles.username}>{item.username} </Text>
                        {item.text}
                      </Text>
                      <View style={styles.actionRow}>
                        <Text style={styles.actionText}>Reply</Text>
                        <Text style={styles.actionText}>See translation</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.heartIcon}>
                      <Text style={{color: '#666', fontSize: 14}}>♡</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              <View style={styles.inputWrapper}>
                <Image source={{ uri: auth.currentUser?.photoURL || 'https://i.pravatar.cc/100' }} style={styles.smallAvatar} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Add a comment..." 
                  placeholderTextColor="#888" 
                  value={comment} 
                  onChangeText={setComment} 
                />
                <TouchableOpacity onPress={handlePost}>
                  <Text style={styles.postBtn}>Post</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheetContainer: { backgroundColor: '#222222', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: height * 0.7, justifyContent: 'space-between' },
  handleContainer: { alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  handle: { width: 36, height: 4, backgroundColor: '#555', borderRadius: 2, marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  listPadding: { paddingVertical: 16 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  content: { marginLeft: 12, flex: 1 },
  commentText: { color: '#ffffff', fontSize: 14, lineHeight: 20 },
  username: { fontWeight: 'bold', color: '#ffffff' },
  actionRow: { flexDirection: 'row', marginTop: 6, gap: 16 },
  actionText: { color: '#888888', fontSize: 12, fontWeight: '600' },
  heartIcon: { marginLeft: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 0.5, borderColor: '#333', backgroundColor: '#222222', paddingBottom: Platform.OS === 'ios' ? 25 : 16 },
  input: { flex: 1, color: '#fff', backgroundColor: '#333333', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 14 },
  postBtn: { color: '#8b5cf6', marginLeft: 12, fontWeight: 'bold' }
})