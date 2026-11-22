import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useContext } from 'react';
import { UserDetailContext } from './../../context/UserDetailContext';
import Colors from '../../constant/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function Header() {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hello, {userDetail?.name || 'Learner'}
        </Text>
        <Text style={styles.subtitle}>Let's Get Started!</Text>
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/addCourse')}
        accessibilityLabel="Create new course"
      >
        <Ionicons name="add" size={20} color={Colors.PRIMARY} />
        <Text style={styles.addBtnText}>New</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    fontFamily: 'outfit-bold',
    fontSize: 25,
    color: Colors.WHITE,
  },
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 17,
    color: Colors.WHITE,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.WHITE,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  addBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    color: Colors.PRIMARY,
  },
});
