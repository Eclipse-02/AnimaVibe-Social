import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';

export default function CreatePostScreen() {
  const [caption, setCaption] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create New Post</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind today, Sultan?..."
          placeholderTextColor="#555"
          multiline
          maxLength={280}
          value={caption}
          onChangeText={setCaption}
        />
      </View>

      <TouchableOpacity style={styles.uploadBox}>
        <Text style={styles.uploadPlaceholder}>+ Add Photo or Video</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  shareBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  shareText: { color: '#000', fontWeight: 'bold' },
  inputContainer: { marginTop: 20 },
  input: { color: '#fff', fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  uploadBox: { height: 200, backgroundColor: '#111', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  uploadPlaceholder: { color: '#666', fontWeight: '600' }
});