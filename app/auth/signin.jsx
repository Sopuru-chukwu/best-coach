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
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
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
import { getAuthErrorMessage } from "../../config/errorMessages";
import { tapLight } from "../../config/haptics";

const showNotice = (title, message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert(title, message);
  }
};

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
    setErrorMsg("");

    if (!trimmedEmail) {
      const msg = "Please enter your email address.";
      setErrorMsg(msg);
      showNotice("Missing Email", msg);
      return;
    }

    if (!password) {
      const msg = "Please enter your password.";
      setErrorMsg(msg);
      showNotice("Missing Password", msg);
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
      const friendly = getAuthErrorMessage(e, "signin");
      setErrorMsg(friendly);
      showNotice("Sign In Failed", friendly);
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      const msg = "Enter your email address first, then tap Forgot Password.";
      setErrorMsg(msg);
      showNotice("Enter Email", msg);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setErrorMsg("");
      Alert.alert(
        "Reset Link Sent",
        `If an account exists for ${trimmedEmail}, a password reset link has been sent to your inbox.`
      );
    } catch (e) {
      console.error("Password reset error:", e);
      const friendly = getAuthErrorMessage(e, "reset");
      setErrorMsg(friendly);
      showNotice("Reset Failed", friendly);
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
        onChangeText={(val) => {
          setEmail(val);
          if (errorMsg) setErrorMsg("");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View
        style={[
          styles.passwordWrapper,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
          },
        ]}
      >
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          style={[styles.passwordInput, { color: colors.text }]}
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMsg) setErrorMsg("");
          }}
          autoCapitalize="none"
        />
        <Pressable
          onPress={() => {
            tapLight();
            setShowPassword((prev) => !prev);
          }}
          style={styles.eyeBtn}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {!!errorMsg && (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: colors.redSoft, borderColor: colors.red },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
          <Text style={[styles.errorText, { color: colors.red }]}>{errorMsg}</Text>
        </View>
      )}

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
    fontSize: 17,
    fontFamily: "outfit",
    marginTop: 20,
    borderRadius: 10,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    width: "100%",
    marginTop: 16,
    borderRadius: 10,
    paddingLeft: 15,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 17,
    fontFamily: "outfit",
  },
  eyeBtn: {
    padding: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: "outfit-medium",
    fontSize: 14,
  },
});
