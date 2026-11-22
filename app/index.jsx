import { Text, View, Image, StyleSheet, TouchableOpacity } from "react-native";
import Colors from "../constant/Colors";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useContext, useEffect } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const router = useRouter();
  const { setUserDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          router.replace("/auth/verifyEmail");
          return;
        }
        try {
          const email = user.email?.toLowerCase() ?? "";
          let userData = null;

          if (email) {
            const userDoc = await getDoc(doc(db, "users", email));
            if (userDoc.exists()) {
              userData = userDoc.data();
            } else if (user.email && user.email !== email) {
              const legacyDoc = await getDoc(doc(db, "users", user.email));
              if (legacyDoc.exists()) {
                userData = legacyDoc.data();
              }
            }
          }

          setUserDetail(
            userData || {
              name: user.displayName || email.split("@")[0] || "Learner",
              email: user.email || email,
              member: false,
              uid: user.uid,
            }
          );
          router.replace("/(tabs)/home");
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require("./../assets/images/landing.png")}
        style={{ width: "100%", height: 280, marginTop: insets.top + 16 }}
        resizeMode="contain"
      />
      <View
        style={{
          padding: 25,
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.primary,
          flex: 1,
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            textAlign: "center",
            color: colors.white,
            fontFamily: "outfit-bold",
          }}
        >
          Welcome to Best Coach
        </Text>

        <Text
          style={{
            fontSize: 20,
            marginTop: 20,
            color: colors.white,
            textAlign: "center",
            fontFamily: "outfit",
          }}
        >
          Transform your ideas into engaging educational content, effortlessly
          with AI
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.white }]}
          onPress={() => router.push("/auth/signup")}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Get Started
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              borderWidth: 1,
              borderColor: colors.white,
            },
          ]}
          onPress={() => router.push("/auth/signin")}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>
            Already have an Account?
          </Text>
        </TouchableOpacity>
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
