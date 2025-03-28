import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import React, { useContext } from 'react';
import { UserDetailContext } from '../../context/UserDetailContext';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { ProfileMenu } from '../../constant/Options';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constant/Colors';

export default function Profile() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const router = useRouter();

  const onMenuClick = (menu) => {
    if (menu.name === 'Logout') {
      signOut(auth)
        .then(() => {
          setUserDetail(null);
          router.push('/');
        })
        .catch((error) => {
          console.error("Logout Error:", error);
        });
    } else if (menu.path) {
      router.push(menu.path);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
      {/* User Info Section */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Image source={require('./../../assets/images/logo.png')}
      style={{
        width: 200,
        height: 200,
        marginTop: 15
      }}/>
        <Text style={{ fontSize: 20, fontFamily:'outfit-bold' }}>
          {userDetail?.name || "User Name"}
        </Text>
        <Text style={{ fontSize: 14, color: 'gray' }}>
          {userDetail?.email || "user@example.com"}
        </Text>
      </View>

      {/* Profile Menu List */}
      <FlatList
        data={ProfileMenu}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onMenuClick(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 25,
              backgroundColor: '#f5f5f5',
              borderRadius: 20,
              marginBottom: 10,
              elevation:1
            }}
          >
            <Ionicons name={item.icon} size={24} color={Colors.PRIMARY}style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 18, fontFamily:'outfit' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
