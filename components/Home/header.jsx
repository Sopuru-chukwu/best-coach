import { View, Text } from 'react-native'
import React, { useContext } from 'react'
import {UserDetailContext} from './../../context/UserDetailContext'
import Colors from '../../constant/Colors'

export default function Header() {
  const {userDetail,setUserDetail}=useContext(UserDetailContext)
  return (
    <View>
      <Text style={{
        fontFamily: 'outfit-bold',
        fontSize: 25,
        color: Colors.WHITE
      }}>Hello, {userDetail?.name} </Text>
      <Text style={{
        fontFamily: 'outfit',
        fontSize: 17,
        color: Colors.WHITE
      }}>Let's Get Started!</Text>
    </View>
  )
}