import React, { useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Progress from 'react-native-progress';
import { useTheme } from '../../context/ThemeContext';
import { UserDetailContext } from '../../context/UserDetailContext';
import {
  getLast7DaysActivity,
  saveDailyGoal,
} from '../../config/learningStats';
import { tapSelection } from '../../config/haptics';

const GOAL_OPTIONS = [1, 2, 3, 5];

export default function WeeklyHeatmapCard() {
  const { colors } = useTheme();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [editingGoal, setEditingGoal] = useState(false);

  const dailyGoal = Number(userDetail?.dailyGoal) || 2;
  const days = useMemo(
    () => getLast7DaysActivity(userDetail?.activityLog || {}, dailyGoal),
    [userDetail?.activityLog, dailyGoal]
  );

  const todayItem = days[days.length - 1];
  const todayCount = todayItem?.count || 0;
  const todayPct = Math.min(1, todayCount / dailyGoal);
  const goalMet = todayCount >= dailyGoal;

  const pickGoal = (val) => {
    tapSelection();
    saveDailyGoal(userDetail, setUserDetail, val);
    setEditingGoal(false);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Study Goal</Text>
          <Text style={[styles.subtitle, { color: goalMet ? colors.green : colors.textMuted }]}>
            {goalMet
              ? `Goal reached! ${todayCount}/${dailyGoal} activities today`
              : `${todayCount} of ${dailyGoal} study activities today`}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            tapSelection();
            setEditingGoal((prev) => !prev);
          }}
          style={[styles.goalBtn, { backgroundColor: colors.primarySoft }]}
        >
          <Ionicons name="flag-outline" size={14} color={colors.primary} />
          <Text style={[styles.goalBtnText, { color: colors.primary }]}>
            Goal: {dailyGoal}/day
          </Text>
        </Pressable>
      </View>

      {editingGoal && (
        <View style={styles.goalPickerRow}>
          {GOAL_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => pickGoal(opt)}
              style={[
                styles.goalChip,
                {
                  backgroundColor: dailyGoal === opt ? colors.primary : colors.cardAlt,
                  borderColor: dailyGoal === opt ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.goalChipText,
                  { color: dailyGoal === opt ? colors.white : colors.text },
                ]}
              >
                {opt} / day
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        <Progress.Bar
          progress={todayPct}
          width={null}
          color={goalMet ? colors.green : colors.primary}
          unfilledColor={colors.cardAlt}
          borderWidth={0}
          height={7}
        />
      </View>

      <View style={styles.heatmapRow}>
        {days.map((d) => {
          const boxBg = d.metGoal
            ? colors.green
            : d.count > 0
              ? colors.primary
              : colors.cardAlt;
          const textColor = d.count > 0 ? colors.white : colors.textMuted;

          return (
            <View key={d.key} style={styles.dayCol}>
              <View
                style={[
                  styles.dayBox,
                  {
                    backgroundColor: boxBg,
                    borderColor: d.isToday ? colors.text : 'transparent',
                    borderWidth: d.isToday ? 1.5 : 0,
                  },
                ]}
              >
                <Text style={[styles.dayCount, { color: textColor }]}>
                  {d.count}
                </Text>
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: d.isToday ? colors.text : colors.textMuted,
                    fontFamily: d.isToday ? 'outfit-bold' : 'outfit',
                  },
                ]}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontFamily: 'outfit-bold',
    fontSize: 17,
  },
  subtitle: {
    fontFamily: 'outfit',
    fontSize: 13,
    marginTop: 2,
  },
  goalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  goalBtnText: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
  },
  goalPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  goalChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalChipText: {
    fontFamily: 'outfit-bold',
    fontSize: 12,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 6,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCount: {
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});
