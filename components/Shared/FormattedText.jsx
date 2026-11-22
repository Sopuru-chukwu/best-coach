import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

function renderInlineSpans(line, { fontSize, color, codeBg, codeColor }) {
  // Split on **bold** or `inline code`
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <Text key={idx} style={{ fontFamily: 'outfit-bold', color }}>
          {token.slice(2, -2)}
        </Text>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <Text
          key={idx}
          style={{
            fontFamily: MONO_FONT,
            fontSize: Math.max(12, fontSize - 2),
            backgroundColor: codeBg,
            color: codeColor,
          }}
        >
          {` ${token.slice(1, -1)} `}
        </Text>
      );
    }
    return <Text key={idx}>{token}</Text>;
  });
}

export default function FormattedText({ text, fontSize = 17, style }) {
  const { colors } = useTheme();
  if (!text || typeof text !== 'string') return null;

  const lines = text.split('\n');
  const lineHeight = Math.round(fontSize * 1.52);
  const textColor = style?.color || colors.text;

  return (
    <View>
      {lines.map((rawLine, index) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <View key={index} style={{ height: 8 }} />;
        }

        const bulletMatch = trimmed.match(/^([-*•]|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          const marker = bulletMatch[1].endsWith('.') ? bulletMatch[1] : '•';
          const body = bulletMatch[2];
          return (
            <View key={index} style={styles.bulletRow}>
              <Text
                style={[
                  styles.bulletMarker,
                  { fontSize, lineHeight, color: colors.primary },
                ]}
              >
                {marker}
              </Text>
              <Text
                style={[
                  styles.bodyText,
                  { fontSize, lineHeight, color: textColor, flex: 1 },
                  style,
                ]}
              >
                {renderInlineSpans(body, {
                  fontSize,
                  color: textColor,
                  codeBg: colors.cardAlt,
                  codeColor: colors.primary,
                })}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={index}
            style={[
              styles.bodyText,
              { fontSize, lineHeight, color: textColor, marginBottom: 6 },
              style,
            ]}
          >
            {renderInlineSpans(trimmed, {
              fontSize,
              color: textColor,
              codeBg: colors.cardAlt,
              codeColor: colors.primary,
            })}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    fontFamily: 'outfit',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletMarker: {
    fontFamily: 'outfit-bold',
  },
});
