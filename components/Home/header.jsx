import { View, Text } from 'react-native'
import React, { useContext } from 'react'
import {UserDetailContext} from './../../context/UserDetailContext'

export default function Header() {
  const {userDetail,setUserDetail}=useContext(UserDetailContext)
  return (
    <View>
      <Text style={{
        fontFamily: 'outfit-bold',
        fontSize: 25
      }}>Hello, {userDetail?.name} </Text>
      <Text style={{
        fontFamily: 'outfit',
        fontSize: 17
      }}>Let's Get Started!</Text>
    </View>
  )
}