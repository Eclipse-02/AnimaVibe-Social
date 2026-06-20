import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function ChatScreen({ route, navigation }) {
  const { name } = route.params;
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { id: '2', text: 'Hey! How are you doing today?', sender: 'them', time: '10:40 AM' },
    { id: '1', text: 'Hey there!', sender: 'me', time: '10:39 AM' }
  ]);

  const sendMessage = () => {
    if (msg.trim()) {
      const newMsg = { 
        id: Date.now().toString(), 
        text: msg, 
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([newMsg, ...messages]);
      setMsg('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerProfile}>
          <Image source={{ uri: 'https://picsum.photos/200' }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrapper, item.sender === 'me' ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
            <View style={[styles.bubble, item.sender === 'me' ? styles.myBubble : styles.theirBubble]}>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="add" size={24} color="#a855f7" />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            value={msg} 
            onChangeText={setMsg} 
            placeholder="Type a message..." 
            placeholderTextColor="#444" 
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  backBtn: { padding: 5 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 15 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusText: { color: '#22c55e', fontSize: 11 },
  chatList: { paddingHorizontal: 16, paddingTop: 10 },
  bubbleWrapper: { marginBottom: 15 },
  myBubbleWrapper: { alignItems: 'flex-end' },
  theirBubbleWrapper: { alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, maxWidth: '75%' },
  myBubble: { backgroundColor: '#a855f7', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#111', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#fff', fontSize: 15 },
  timeText: { color: '#444', fontSize: 10, marginTop: 4, marginHorizontal: 5 },
  inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#111' },
  input: { flex: 1, backgroundColor: '#111', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, color: '#fff', fontSize: 15 },
  actionBtn: { padding: 10 },
  sendBtn: { backgroundColor: '#a855f7', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});