import { View, Text, StyleSheet, TouchableOpacity, TextInput, Pressable, Image, ToastAndroid, ActivityIndicator } from "react-native";
import React, { useContext, useState } from "react";;
import Colors from "../../constant/Colors";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserDetailContext } from "./../../context/UserDetailContext";

export default function SignIn() {
  const router=useRouter();
  const [email, setEmail]=useState();
  const [password, setPassword]=useState();
  const {userDetail, setUserDetail}=useContext(UserDetailContext);
  const [loading,setLoading]=useState(false);

  const onSignIn=()=>{
    setLoading(true)
    signInWithEmailAndPassword(auth, email, password)
    .then (async(resp)=>{
      const user=resp.user
      console.log(user)
     await getUserDetail();
     setLoading(false);
     router.replace('/(tabs)/home')
    }).catch(e=>{
      console.log(e)
      setLoading(false);
      ToastAndroid.show('Incorrect Email or Password', ToastAndroid.BOTTOM)
    })
  }

  const getUserDetail=async()=>{
    const result=await getDoc(doc(db, 'users', email));
    console.log(result.data())
    setUserDetail(result.data())
  }
  return (
    <View
      style={{
        display: "flex",
        alignItems: "center",
        paddingTop: 100,
        flex: 1,
        backgroundColor: Colors.WHITE,
        padding: 25,
      }}
    >
      <Image
        source={require("./../../assets/images/logo.png")}
        style={{
          width: 180,
          height: 180,
        }}
      />
      <Text
        style={{
          fontSize: 30,
          fontFamily: "outfit-bold",
        }}
      >
        {" "}
        Welcome Back
      </Text>

      <TextInput placeholder="Email" style={styles.textInput}  onChangeText={(value)=>setEmail(value)} />
      <TextInput
        placeholder="Password"
        secureTextEntry={true}
        style={styles.textInput}
        onChangeText={(value)=>setPassword(value)}
      />

      <TouchableOpacity
        style={{
          padding: 15,
          backgroundColor: Colors.PRIMARY,
          width: "100%",
          marginTop: 25,
          borderRadius: 10,
        }}
        onPress={onSignIn}
        disabled={loading}
      >
        {!loading? <Text
          style={{
            fontFamily: "outfit",
            fontSize: 20,
            color: Colors.WHITE,
            textAlign: "center",
          }}
        >
          Sign In
        </Text>: 
        <ActivityIndicator size={'large'} color={Colors.WHITE} />
        }
      </TouchableOpacity>

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 5,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            fontFamily: "outfit",
          }}
        >
          Don't have an account?
        </Text>
        <Pressable onPress={() => router.push("/auth/signup")}>
          <Text
            style={{
              color: Colors.PRIMARY,
              fontFamily: "outfit-bold",
            }}
          >
            Create new Here
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  textInput: {
    borderWidth: 1,
    width: "100%",
    padding: 15,
    fontSize: 18,
    marginTop: 20,
    borderRadius: 8,
  },
});
