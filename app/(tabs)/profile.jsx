import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserDetailContext } from '../../context/UserDetailContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { ProfileMenu } from '../../constant/Options';
import { LEARNER_LEVELS, TEACHING_STYLES } from '../../constant/Prompts';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Shared/Button';
import {
  loadReminderSettings,
  REMINDER_PRESETS,
  scheduleDailyReminder,
} from '../../config/reminders';
import { tapSelection } from '../../config/haptics';

const THEME_MODES = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function Profile() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { mode, setMode, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(userDetail?.name || '');
  const [prefLevel, setPrefLevel] = useState(
    userDetail?.preferredLevel || LEARNER_LEVELS[0]
  );
  const [prefStyle, setPrefStyle] = useState(
    userDetail?.preferredStyle || TEACHING_STYLES[0]
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [reminder, setReminder] = useState({ enabled: false, label: 'Off' });

  useEffect(() => {
    loadReminderSettings().then(setReminder);
  }, []);

  const handleSelectReminder = async (preset) => {
    tapSelection();
    try {
      const updated = await scheduleDailyReminder(preset);
      setReminder(updated);
    } catch (err) {
      Alert.alert('Reminder Error', err?.message || 'Could not update study reminder.');
    }
  };

  const openPrefs = () => {
    setNameInput(userDetail?.name || '');
    setPrefLevel(userDetail?.preferredLevel || LEARNER_LEVELS[0]);
    setPrefStyle(userDetail?.preferredStyle || TEACHING_STYLES[0]);
    setPrefsOpen(true);
  };

  const savePreferences = async () => {
    const email = userDetail?.email?.trim()?.toLowerCase();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Display name cannot be empty.');
      return;
    }

    setSavingPrefs(true);
    try {
      const updates = {
        name: trimmedName,
        preferredLevel: prefLevel,
        preferredStyle: prefStyle,
      };
      if (email) {
        await setDoc(doc(db, 'users', email), updates, { merge: true });
      }
      setUserDetail((prev) => ({ ...(prev || {}), ...updates }));
      setPrefsOpen(false);
    } catch (err) {
      Alert.alert('Save Failed', err?.message || 'Could not update profile.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const onMenuClick = (menu) => {
    if (menu.name === 'Logout') {
      signOut(auth)
        .then(() => {
          setUserDetail(null);
          router.replace('/');
        })
        .catch((error) => {
          console.error('Logout Error:', error);
          Alert.alert('Logout Error', 'Unable to sign out. Please try again.');
        });
    } else if (menu.path) {
      router.push(menu.path);
    } else if (menu.name === 'My Subscription') {
      Alert.alert(
        'Subscription',
        userDetail?.member
          ? 'You have an active membership.'
          : 'You are currently on the free plan.'
      );
    }
  };

  const streakDays = Number(userDetail?.streakDays) || 0;
  const streakFreezes =
    typeof userDetail?.streakFreezes === 'number' ? userDetail.streakFreezes : 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
      }}
    >
      <FlatList
        data={ProfileMenu}
        keyExtractor={(item) => item.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
        ListHeaderComponent={
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={require('./../../assets/images/logo.png')}
              style={{ width: 112, height: 112, borderRadius: 24 }}
            />
            <Text style={{ fontSize: 22, fontFamily: 'outfit-bold', marginTop: 8, color: colors.text }}>
              {userDetail?.name || 'Learner'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontFamily: 'outfit' }}>
              {userDetail?.email || 'user@example.com'}
            </Text>

            <View style={styles.badgeRow}>
              <Text style={[styles.badge, { color: colors.amber, backgroundColor: colors.amberSoft }]}>
                🔥 {streakDays}d streak
              </Text>
              <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
                ❄️ {streakFreezes} freeze{streakFreezes === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.badge, { color: colors.green, backgroundColor: colors.greenSoft }]}>
                {userDetail?.preferredLevel || LEARNER_LEVELS[0]}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.editBtn, { borderColor: colors.primary }]}
              onPress={openPrefs}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>
                Edit Profile & Learning Defaults
              </Text>
            </TouchableOpacity>

            <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>Appearance</Text>
              <View style={styles.themeRow}>
                {THEME_MODES.map((item) => {
                  const active = mode === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setMode(item.key)}
                      style={[
                        styles.themeOption,
                        {
                          backgroundColor: active ? colors.primary : colors.cardAlt,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={active ? colors.white : colors.text}
                      />
                      <Text
                        style={[
                          styles.themeOptionText,
                          { color: active ? colors.white : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>
                Daily Study Reminder
              </Text>
              <View style={styles.chipRow}>
                {REMINDER_PRESETS.map((preset) => {
                  const active = (reminder?.label || 'Off') === preset.label;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => handleSelectReminder(preset)}
                    >
                      <Text
                        style={[
                          styles.chip,
                          { borderColor: colors.border, color: colors.text, backgroundColor: colors.cardAlt },
                          active && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                            color: colors.white,
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onMenuClick(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              marginBottom: 10,
            }}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text style={{ fontSize: 17, fontFamily: 'outfit', color: colors.text, flex: 1 }}>
              {item.name}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={prefsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrefsOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profile & Preferences</Text>
            <Pressable onPress={() => setPrefsOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Display Name</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.label, { color: colors.text }]}>Default Learner Level</Text>
          <View style={styles.chipRow}>
            {LEARNER_LEVELS.map((lvl) => (
              <Pressable key={lvl} onPress={() => setPrefLevel(lvl)}>
                <Text
                  style={[
                    styles.chip,
                    { borderColor: colors.border, color: colors.text },
                    prefLevel === lvl && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      color: colors.white,
                    },
                  ]}
                >
                  {lvl}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Default Teaching Style</Text>
          <View style={styles.chipRow}>
            {TEACHING_STYLES.map((st) => (
              <Pressable key={st} onPress={() => setPrefStyle(st)}>
                <Text
                  style={[
                    styles.chip,
                    { borderColor: colors.border, color: colors.text },
                    prefStyle === st && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      color: colors.white,
                    },
                  ]}
                >
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 20 }}>
            <Button text="Save Changes" onPress={savePreferences} loading={savingPrefs} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  editBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  themeCard: {
    width: '100%',
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeLabel: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    marginBottom: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeOptionText: {
    fontFamily: 'outfit-medium',
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 28 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 22,
  },
  label: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontFamily: 'outfit',
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 99,
    fontFamily: 'outfit',
    fontSize: 14,
  },
});
