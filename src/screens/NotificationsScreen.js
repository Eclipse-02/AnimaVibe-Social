import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>New</Text>
        <View style={styles.notifRow}>
          <Image source={{ uri: 'https://picsum.photos/id/30/200' }} style={styles.avatarDummy} cachePolicy="disk" />
          <Text style={styles.notifText}>Usamah Gozi liked your recent photo.</Text>
          <Text style={styles.notifTime}>2m</Text>
        </View>
        <View style={styles.notifRow}>
          <View style={styles.securityPhotoDummy} />
          <View style={{flex: 1}}>
            <Text style={styles.notifText}>Your security alert was updated.</Text>
            <View style={{flexDirection: 'row', marginTop: 8}}>
              <View style={styles.actionBtn}><Text style={styles.actionBtnText}>Review</Text></View>
              <View style={[styles.actionBtn, {backgroundColor: 'transparent'}]}><Text style={styles.actionBtnText}>Dismiss</Text></View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10
  },
  notifRow: {
    flexDirection: 'row',
    marginBottom: 20
  },
  avatarDummy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333'
  },
  securityPhotoDummy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000'
  },
  notifText: {
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
    fontSize: 14
  },
  notifTime: {
    color: '#777777',
    fontSize: 12
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12
  }
})