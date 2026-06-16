import React, { useEffect, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, TextInput, KeyboardAvoidingView, Platform, Animated, SafeAreaView, StatusBar } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons, Feather } from '@expo/vector-icons'

const { width, height } = Dimensions.get('window')

export default function StoryScreen({ navigation }) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        navigation.goBack()
      }
    })
  }, [])

  const widthAnimation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  })

  const handlePress = (evt) => {
    const x = evt.nativeEvent.locationX
    if (x < width / 3) {
      progress.setValue(0)
      Animated.timing(progress, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false
      }).start(({ finished }) => {
        if (finished) navigation.goBack()
      })
    } else {
      navigation.goBack()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <View style={styles.backgroundContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f' }} 
          style={styles.storyImage}
          contentFit="cover"
        />
        <TouchableOpacity activeOpacity={1} style={styles.touchArea} onPress={handlePress} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View style={[styles.progressBarFill, { width: widthAnimation }]} />
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userLeft}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167' }} style={styles.avatar} />
              <Text style={styles.username}>cyber_vibe</Text>
              <Text style={styles.time}>2h</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Send message"
              placeholderTextColor="#ffffff"
            />
          </View>
          <TouchableOpacity style={styles.footerIcon}>
            <Ionicons name="heart-outline" size={28} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerIcon}>
            <Feather name="send" size={24} color="#ffffff" style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: Platform.OS === 'ios' ? 16 : 0,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingHorizontal: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  time: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  inputContainer: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginRight: 16,
  },
  input: {
    color: '#ffffff',
    fontSize: 14,
  },
  footerIcon: {
    marginLeft: 16,
  },
  sendIcon: {
    transform: [{ rotate: '15deg' }, { translateY: -2 }, { translateX: -2 }]
  }
})