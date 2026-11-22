import { View, Text, Image } from 'react-native';
import React from 'react';
import * as Progress from 'react-native-progress';
import { getBannerImage } from '../../constant/Options';
import { getCourseQuizPercent } from '../../config/learningStats';
import { useTheme } from '../../context/ThemeContext';

export default function CourseProgressCard({ item, width = 280 }) {
  const { colors } = useTheme();
  const completedCount = Array.isArray(item?.completedChapter)
    ? item.completedChapter.length
    : 0;
  const totalChapters = Array.isArray(item?.chapters) ? item.chapters.length : 0;
  const progress =
    totalChapters > 0 ? Math.min(1, completedCount / totalChapters) : 0;
  const barWidth = typeof width === 'number' ? Math.max(0, width - 30) : null;
  const quizPct = getCourseQuizPercent(item);

  return (
    <View
      style={{
        margin: 7,
        padding: 15,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 15,
        width: width,
        elevation: 3,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Image
          source={getBannerImage(item?.banner_image)}
          style={{
            width: 80,
            height: 80,
            borderRadius: 10,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: 'outfit-bold',
              fontSize: 18,
              color: colors.text,
              flexWrap: 'wrap',
            }}
          >
            {item?.courseTitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ fontFamily: 'outfit', fontSize: 14, color: colors.textMuted }}>
              {totalChapters} Chapters
            </Text>
            {quizPct !== null && (
              <Text
                style={{
                  fontFamily: 'outfit-bold',
                  fontSize: 12,
                  color: quizPct >= 60 ? colors.green : colors.amber,
                  backgroundColor: quizPct >= 60 ? colors.greenSoft : colors.amberSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 99,
                }}
              >
                Quiz {quizPct}%
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Progress.Bar
          progress={progress}
          width={barWidth}
          color={colors.primary}
          unfilledColor={colors.cardAlt}
          borderWidth={0}
          height={7}
        />
        <Text
          style={{
            fontFamily: 'outfit',
            marginTop: 5,
            fontSize: 13,
            color: colors.textMuted,
          }}
        >
          {completedCount} out of {totalChapters} chapters completed
        </Text>
      </View>
    </View>
  );
}
