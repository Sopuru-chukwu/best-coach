import { Text, View, Image, StyleSheet, TouchableOpacity } from "react-native";
import Colors from "../constant/Colors";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useContext, useEffect } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";

export default function Index() {
  const router = useRouter();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User detected:", user);
        try {
          const userDoc = await getDoc(doc(db, "users", user?.email));
          if (userDoc.exists()) {
            setUserDetail(userDoc.data());
            router.replace("/(tabs)/home");
          } else {
            console.warn("User data not found in Firestore");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    // Cleanup function to avoid memory leaks
    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <Image
        source={require("./../assets/images/landing.png")}
        style={{ width: "100%", height: 300, marginTop: 50 }}
      />
      <View
        style={{
          padding: 25,
          backgroundColor: Colors.PRIMARY,
          height: "100%",
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            textAlign: "center",
            color: Colors.WHITE,
            fontFamily: "outfit-bold",
          }}
        >
          Welcome to Best Coach
        </Text>

        <Text
          style={{
            fontSize: 20,
            marginTop: 20,
            color: Colors.WHITE,
            textAlign: "center",
            fontFamily: "outfit",
          }}
        >
          Transform your ideas into engaging educational content, effortlessly
          with AI
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth/signup")}
        >
          <Text style={[styles.buttonText, { color: Colors.PRIMARY }]}>
            Get Started
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.button,
            {
              backgroundColor: Colors.PRIMARY,
              borderWidth: 1,
              borderColor: Colors.WHITE,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: Colors.WHITE }]}>
            Already have an Account?
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    backgroundColor: Colors.WHITE,
    marginTop: 20,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: "outfit",
  },
});
