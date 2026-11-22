import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const REMINDER_KEY = 'best_coach_daily_reminder_v1';

export const REMINDER_PRESETS = [
  { label: 'Off', hour: null, minute: null },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '7:00 PM', hour: 19, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // ignore in unsupported runtimes
  }
}

export async function loadReminderSettings() {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, hour: null, minute: null, label: 'Off' };
  } catch {
    return { enabled: false, hour: null, minute: null, label: 'Off' };
  }
}

export async function cancelDailyReminder() {
  const saved = { enabled: false, hour: null, minute: null, label: 'Off' };
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(saved)).catch(() => {});
  if (Platform.OS !== 'web') {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }
  return saved;
}

export async function scheduleDailyReminder({ hour, minute, label }) {
  if (hour === null || minute === null) {
    return cancelDailyReminder();
  }

  if (Platform.OS === 'web') {
    const saved = { enabled: true, hour, minute, label };
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(saved)).catch(() => {});
    return saved;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permission was denied. Enable notifications in device settings.');
  }

  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to learn with Best Coach! 📚',
      body: 'Keep your streak alive—finish a quick lesson or review your due flashcards.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  const saved = { enabled: true, hour, minute, label };
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(saved)).catch(() => {});
  return saved;
}
