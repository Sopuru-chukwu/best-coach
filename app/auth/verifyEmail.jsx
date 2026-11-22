import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { reload, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { UserDetailContext } from '../../context/UserDetailContext';
import Button from '../../components/Shared/Button';
import { notifySuccess, tapLight } from '../../config/haptics';

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyEmail() {
  const { justSent } = useLocalSearchParams();
  const { colors } = useTheme();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(
    justSent === 'true' ? RESEND_COOLDOWN_SEC : 0
  );

  const currentEmail = auth.currentUser?.email || userDetail?.email || '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const finishVerifiedLogin = async (user) => {
    const email = (user.email || '').trim().toLowerCase();
    let profile = userDetail;

    if (!profile && email) {
      try {
        const snap = await getDoc(doc(db, 'users', email));
        if (snap.exists()) {
          profile = snap.data();
        }
      } catch {
        // Fallback below
      }
    }

    setUserDetail(
      profile || {
        name: user.displayName || email.split('@')[0] || 'Learner',
        email: user.email || email,
        member: false,
        uid: user.uid,
      }
    );

    notifySuccess();
    router.replace('/(tabs)/home');
  };

  // Gently auto-check every 4 seconds so returning from the email app unlocks automatically
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        await reload(user);
        if (auth.currentUser?.emailVerified) {
          clearInterval(interval);
          await finishVerifiedLogin(auth.currentUser);
        }
      } catch {
        // Ignore transient network errors during background poll
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckVerified = async () => {
    tapLight();
    const user = auth.currentUser;
    if (!user) {
      router.replace('/auth/signin');
      return;
    }

    setChecking(true);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        await finishVerifiedLogin(auth.currentUser);
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Open the verification email we sent you and tap the link, then press Continue again. Check Spam/Junk if you do not see it.'
        );
      }
    } catch (err) {
      Alert.alert('Check Failed', err?.message || 'Could not verify status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    tapLight();
    const user = auth.currentUser;
    if (!user) {
      router.replace('/auth/signin');
      return;
    }

    setResending(true);
    try {
      await sendEmailVerification(user);
      setCooldown(RESEND_COOLDOWN_SEC);
      Alert.alert(
        'Email Sent',
        `A fresh verification link was sent to ${currentEmail}.`
      );
    } catch (err) {
      const msg =
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Please wait a minute before requesting another email.'
          : err?.message || 'Could not resend verification email.';
      Alert.alert('Resend Failed', msg);
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    tapLight();
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUserDetail(null);
    router.replace('/auth/signin');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="mail-unread-outline" size={48} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        We sent a verification link to:
      </Text>
      <Text style={[styles.emailText, { color: colors.primary }]}>
        {currentEmail || 'your email address'}
      </Text>

      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          1. Open your inbox (check Spam/Junk if needed).{'\n'}
          2. Tap the Firebase verification link.{'\n'}
          3. Return here—we'll sign you in automatically, or tap Continue below.
        </Text>
      </View>

      <Button
        text="I've Verified — Continue"
        onPress={handleCheckVerified}
        loading={checking}
      />

      <Button
        text={
          cooldown > 0
            ? `Resend Email (${cooldown}s)`
            : 'Resend Verification Email'
        }
        type="outline"
        onPress={handleResend}
        loading={resending}
      />

      <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
        <Text style={[styles.signOutText, { color: colors.textMuted }]}>
          Use a different email / Sign Out
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  emailText: {
    fontFamily: 'outfit-bold',
    fontSize: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'outfit',
    fontSize: 15,
    lineHeight: 24,
  },
  signOutBtn: {
    marginTop: 22,
    padding: 8,
  },
  signOutText: {
    fontFamily: 'outfit-medium',
    fontSize: 15,
  },
});
