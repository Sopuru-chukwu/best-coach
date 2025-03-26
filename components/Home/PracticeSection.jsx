import { View, Text, Image } from 'react-native'
import React from 'react'
import { FlatList } from 'react-native'
import { PraticeOption } from '../../constant/Options'
import Colors from '../../constant/Colors'

export default function PracticeSection() {
  return (
    <View style={{
        marginTop: 10
    }}>
      <Text style={{
        fontFamily: 'outfit-bold',
        fontSize: 25
      }}>Practice</Text>

      <View>
        <FlatList
            data={PraticeOption}
            numColumns={3}
            renderItem={({item,index})=>(
                <View key={index} style={{
                    flex: 1,
                    margin: 5,
                    aspectRatio: 1
                }}>
                    <Image source={item?.image} style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: 160,
                        borderRadius: 15
                    }} />
                    <Text style={{
                        position: 'absolute',
                        padding: 15,
                        fontSize: 15,
                        fontFamily: 'outfit',
                        color: Colors.WHITE
                    }}> {item?.name} </Text>
                </View>
             )}
        />
      </View>
    </View>
  )
}