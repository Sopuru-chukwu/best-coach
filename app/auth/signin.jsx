import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Image,
  ToastAndroid,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import React, { useContext, useState } from "react";
import Colors from "../../constant/Colors";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import {
  reload,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserDetailContext } from "./../../context/UserDetailContext";
import { useTheme } from "./../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const showNotice = (title, message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.BOTTOM);
  } else {
    Alert.alert(title, message);
  }
};

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUserDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const getUserDetail = async (signedInUser, fallbackEmail) => {
    const normalizedEmail = (signedInUser?.email || fallbackEmail).trim().toLowerCase();
    const candidates = [normalizedEmail];
    if (signedInUser?.email && signedInUser.email !== normalizedEmail) {
      candidates.push(signedInUser.email);
    }

    for (const docId of candidates) {
      const result = await getDoc(doc(db, "users", docId));
      if (result.exists()) {
        setUserDetail(result.data());
        return;
      }
    }

    setUserDetail({
      name: signedInUser?.displayName || normalizedEmail.split("@")[0] || "Learner",
      email: signedInUser?.email || normalizedEmail,
      member: false,
      uid: signedInUser?.uid,
    });
  };

  const onSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showNotice("Missing Details", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const resp = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      await reload(resp.user).catch(() => {});
      if (!auth.currentUser?.emailVerified && !resp.user.emailVerified) {
        router.replace("/auth/verifyEmail");
        return;
      }
      await getUserDetail(resp.user, trimmedEmail);
      router.replace("/(tabs)/home");
    } catch (e) {
      console.error("Sign in error:", e);
      const code = e?.code || "";
      if (code === "permission-denied" || e?.message?.includes("insufficient permissions")) {
        showNotice(
          "Database Permission Error",
          "Signed in, but Firestore denied access. Update your Firestore Security Rules in Firebase Console."
        );
      } else if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        showNotice("Sign In Failed", "Incorrect Email or Password");
      } else {
        showNotice("Sign In Failed", e?.message || "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showNotice("Enter Email", "Type your email address first, then tap Forgot Password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        "Reset Link Sent",
        `If an account exists for ${trimmedEmail}, a password reset email has been sent.`
      );
    } catch (e) {
      showNotice("Reset Failed", e?.message || "Could not send password reset email.");
    }
  };

  return (
    <View
      style={{
        display: "flex",
        alignItems: "center",
        paddingTop: insets.top + 48,
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 25,
      }}
    >
      <Image
        source={require("./../../assets/images/logo.png")}
        style={{
          width: 150,
          height: 150,
          borderRadius: 28,
        }}
      />
      <Text
        style={{
          fontSize: 30,
          fontFamily: "outfit-bold",
          color: colors.text,
          marginTop: 12,
        }}
      >
        Welcome Back
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
            color: colors.text,
          },
        ]}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry={true}
        style={[
          styles.textInput,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
            color: colors.text,
          },
        ]}
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        onPress={onForgotPassword}
        style={{ alignSelf: "flex-end", marginTop: 10 }}
      >
        <Text style={{ color: colors.primary, fontFamily: "outfit-bold", fontSize: 14 }}>
          Forgot Password?
        </Text>
      </Pressable>

      <TouchableOpacity
        style={{
          padding: 15,
          backgroundColor: colors.primary,
          width: "100%",
          marginTop: 22,
          borderRadius: 12,
        }}
        onPress={onSignIn}
        disabled={loading}
      >
        {!loading ? (
          <Text
            style={{
              fontFamily: "outfit-bold",
              fontSize: 18,
              color: colors.white,
              textAlign: "center",
            }}
          >
            Sign In
          </Text>
        ) : (
          <ActivityIndicator size={"small"} color={colors.white} />
        )}
      </TouchableOpacity>

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 5,
          marginTop: 20,
        }}
      >
        <Text style={{ fontFamily: "outfit", color: colors.textMuted }}>
          Don't have an account?
        </Text>
        <Pressable onPress={() => router.push("/auth/signup")}>
          <Text
            style={{
              color: colors.primary,
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
