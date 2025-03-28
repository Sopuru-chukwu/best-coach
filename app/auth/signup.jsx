import { View, Text, Image, TextInput, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import React, { useContext, useState } from 'react'
import Colors from "./../../constant/Colors"
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './../../config/firebaseConfig'; 
import { UserDetailContext } from './../../context/UserDetailContext';



export default function SignUp() {

  const router=useRouter();
  const [fullName, setFullName]=useState();
  const [email, setEmail]=useState();
  const [password, setPassword]=useState();
  const {userDetail, setUserDetail}=useContext(UserDetailContext)

  const CreateNewAccount=()=>{
    createUserWithEmailAndPassword(auth,email,password)
    .then(async(resp)=>{
      const user=resp.user;
      console.log(user);
      await SaveUser(user);
      //save user to database
    })
    .catch(e=>{
      console.log(e.message)
    })
  }

  const SaveUser=async(user)=>{
    const data = {
      name:fullName,
      email:email,
      member:false,
      uid:user?.uid
    }
    await setDoc(doc(db, 'users',email),data)

    setUserDetail(data);

    //navigate to new screen
    // router.replace('/auth/signin')
  }
  return (
    <View style={{
      display: 'flex',
      alignItems: 'center',
      paddingTop: 100,
      flex: 1,
      backgroundColor: Colors.WHITE,
      padding: 25
    }}>
      <Image source={require('./../../assets/images/logo.png')}
          style ={{
            width: 180,
            height: 180
          }} 
      />
      <Text style={{
        fontSize: 30,
        fontFamily: 'outfit-bold'
      }}> Create New Account</Text>

      <TextInput placeholder='Fullname' style={styles.textInput} onChangeText={(value)=>setFullName(value)} />
      <TextInput placeholder='Email' style={styles.textInput} onChangeText={(value)=>setEmail(value)} />
      <TextInput placeholder='Password' secureTextEntry={true} style={styles.textInput} onChangeText={(value)=>setPassword(value)} />

      <TouchableOpacity style={{
        padding: 15,
        backgroundColor: Colors.PRIMARY,
        width: '100%',
        marginTop: 25,
        borderRadius: 10
      }} onPress={CreateNewAccount}>
        <Text style={{
          fontFamily: 'outfit',
          fontSize: 20,
          color: Colors.WHITE,
          textAlign: 'center'
        }}>Create Account</Text>
      </TouchableOpacity>

      <View style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 5,
        marginTop: 20

      }}>
        <Text style={{
          fontFamily: 'outfit'
        }}>Already have an account?</Text>
          <Pressable onPress={()=>router.push('/auth/signin')}>
            <Text style={{
              color: Colors.PRIMARY,
              fontFamily: 'outfit-bold'
            }}>Sign In Here</Text>
          </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  textInput: {
    borderWidth: 1,
    width: '100%',
    padding: 15,
    fontSize: 18,
    marginTop: 20,
    borderRadius: 8
  }
}) 