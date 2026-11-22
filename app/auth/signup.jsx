import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, { useContext, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './../../config/firebaseConfig';
import { UserDetailContext } from './../../context/UserDetailContext';
import { useTheme } from './../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthErrorMessage } from '../../config/errorMessages';
import { tapLight } from '../../config/haptics';

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserDetail } = useContext(UserDetailContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const SaveUser = async (user, normalizedEmail, trimmedName) => {
    const data = {
      name: trimmedName,
      email: normalizedEmail,
      member: false,
      uid: user?.uid,
    };
    await setDoc(doc(db, 'users', normalizedEmail), data);
    setUserDetail(data);
  };

  const CreateNewAccount = async () => {
    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMsg('');

    if (!trimmedName || !normalizedEmail || !password) {
      const msg = 'Please fill in your name, email, and password.';
      setErrorMsg(msg);
      Alert.alert('Missing Details', msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setErrorMsg(msg);
      Alert.alert('Weak Password', msg);
      return;
    }

    setLoading(true);
    try {
      const resp = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await SaveUser(resp.user, normalizedEmail, trimmedName);
      await sendEmailVerification(resp.user);
      router.replace({ pathname: '/auth/verifyEmail', params: { justSent: 'true' } });
    } catch (e) {
      console.error('Sign up error:', e);
      const friendly = getAuthErrorMessage(e, 'signup');
      setErrorMsg(friendly);
      Alert.alert('Sign Up Failed', friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingTop: insets.top + 40,
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 25,
      }}
    >
      <Image
        source={require('./../../assets/images/logo.png')}
        style={{
          width: 150,
          height: 150,
          borderRadius: 28,
        }}
      />
      <Text
        style={{
          fontSize: 30,
          fontFamily: 'outfit-bold',
          color: colors.text,
          marginTop: 12,
        }}
      >
        Create New Account
      </Text>

      <TextInput
        placeholder="Full Name"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text },
        ]}
        value={fullName}
        onChangeText={(val) => {
          setFullName(val);
          if (errorMsg) setErrorMsg('');
        }}
      />
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text },
        ]}
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          if (errorMsg) setErrorMsg('');
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View
        style={[
          styles.passwordWrapper,
          { borderColor: colors.border, backgroundColor: colors.inputBg },
        ]}
      >
        <TextInput
          placeholder="Password (min. 6 characters)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          style={[styles.passwordInput, { color: colors.text }]}
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMsg) setErrorMsg('');
          }}
          autoCapitalize="none"
        />
        <Pressable
          onPress={() => {
            tapLight();
            setShowPassword((prev) => !prev);
          }}
          style={styles.eyeBtn}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
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

      <TouchableOpacity
        style={{
          padding: 15,
          backgroundColor: colors.primary,
          width: '100%',
          marginTop: 22,
          borderRadius: 12,
        }}
        onPress={CreateNewAccount}
        disabled={loading}
      >
        {!loading ? (
          <Text
            style={{
              fontFamily: 'outfit-bold',
              fontSize: 18,
              color: colors.white,
              textAlign: 'center',
            }}
          >
            Create Account
          </Text>
        ) : (
          <ActivityIndicator size="small" color={colors.white} />
        )}
      </TouchableOpacity>

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 5,
          marginTop: 20,
        }}
      >
        <Text style={{ fontFamily: 'outfit', color: colors.textMuted }}>
          Already have an account?
        </Text>
        <Pressable onPress={() => router.push('/auth/signin')}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: 'outfit-bold',
            }}
          >
            Sign In Here
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  textInput: {
    borderWidth: 1,
    width: '100%',
    padding: 15,
    fontSize: 17,
    fontFamily: 'outfit',
    marginTop: 16,
    borderRadius: 10,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
    marginTop: 16,
    borderRadius: 10,
    paddingLeft: 15,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 17,
    fontFamily: 'outfit',
  },
  eyeBtn: {
    padding: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: 'outfit-medium',
    fontSize: 14,
  },
});
