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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './../../config/firebaseConfig';
import { UserDetailContext } from './../../context/UserDetailContext';

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserDetail } = useContext(UserDetailContext);

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
      router.replace('/(tabs)/home');
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
        paddingTop: 100,
        flex: 1,
        backgroundColor: Colors.WHITE,
        padding: 25,
      }}
    >
      <Image
        source={require('./../../assets/images/logo.png')}
        style={{
          width: 180,
          height: 180,
        }}
      />
      <Text
        style={{
          fontSize: 30,
          fontFamily: 'outfit-bold',
        }}
      >
        Create New Account
      </Text>

      <TextInput
        placeholder="Fullname"
        style={styles.textInput}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        placeholder="Email"
        style={styles.textInput}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry={true}
        style={styles.textInput}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={{
          padding: 15,
          backgroundColor: Colors.PRIMARY,
          width: '100%',
          marginTop: 25,
          borderRadius: 10,
        }}
        onPress={CreateNewAccount}
        disabled={loading}
      >
        {!loading ? (
          <Text
            style={{
              fontFamily: 'outfit',
              fontSize: 20,
              color: Colors.WHITE,
              textAlign: 'center',
            }}
          >
            Create Account
          </Text>
        ) : (
          <ActivityIndicator size="large" color={Colors.WHITE} />
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
        <Text style={{ fontFamily: 'outfit' }}>Already have an account?</Text>
        <Pressable onPress={() => router.push('/auth/signin')}>
          <Text
            style={{
              color: Colors.PRIMARY,
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
