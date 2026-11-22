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
import Colors from './../../constant/Colors';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './../../config/firebaseConfig';
import { UserDetailContext } from './../../context/UserDetailContext';
import { useTheme } from './../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!trimmedName || !normalizedEmail || !password) {
      Alert.alert('Missing Details', 'Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
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
      Alert.alert('Sign Up Failed', e?.message || 'Unable to create account.');
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
        placeholder="Fullname"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text },
        ]}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.textInput,
          { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text },
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
          { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text },
        ]}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={{
          padding: 15,
          backgroundColor: colors.primary,
          width: '100%',
          marginTop: 25,
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
    fontSize: 18,
    marginTop: 20,
    borderRadius: 8,
  },
});
