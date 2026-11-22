import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

export function ConceptFlowCard({ steps = [] }) {
  const { colors } = useTheme();
  const cleanSteps = Array.isArray(steps)
    ? steps.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 6)
    : [];

  if (cleanSteps.length < 2) return null;

  const nodeW = 128;
  const nodeH = 44;
  const gap = 30;
  const totalWidth = cleanSteps.length * nodeW + (cleanSteps.length - 1) * gap + 16;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.labelRow}>
        <Ionicons name="git-network-outline" size={17} color={colors.primary} />
        <Text style={[styles.label, { color: colors.primary }]}>Visual Flow</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={totalWidth} height={nodeH + 16}>
          {cleanSteps.map((step, idx) => {
            const x = 8 + idx * (nodeW + gap);
            const y = 8;
            const shortLabel = step.length > 18 ? `${step.slice(0, 17)}…` : step;
            const arrowStart = x + nodeW + 3;
            const arrowEnd = x + nodeW + gap - 5;
            const midY = y + nodeH / 2;

            return (
              <React.Fragment key={idx}>
                <Rect
                  x={x}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx={12}
                  fill={colors.primarySoft}
                  stroke={colors.primary}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={x + nodeW / 2}
                  y={midY + 4}
                  fontSize="12"
                  fontWeight="600"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {shortLabel}
                </SvgText>

                {idx < cleanSteps.length - 1 && (
                  <>
                    <Line
                      x1={arrowStart}
                      y1={midY}
                      x2={arrowEnd}
                      y2={midY}
                      stroke={colors.primary}
                      strokeWidth={2}
                    />
                    <Polygon
                      points={`${arrowEnd + 4},${midY} ${arrowEnd - 3},${midY - 4} ${arrowEnd - 3},${midY + 4}`}
                      fill={colors.primary}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

export function ComparisonTableCard({ table }) {
  const { colors } = useTheme();
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!headers.length || !rows.length) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.labelRow}>
        <Ionicons name="grid-outline" size={17} color={colors.primary} />
        <Text style={[styles.label, { color: colors.primary }]}>Comparison Table</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 300 }}>
          <View
            style={[
              styles.tableRow,
              {
                backgroundColor: colors.primarySoft,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {headers.map((h, i) => (
              <Text
                key={i}
                style={[styles.thCell, { color: colors.primary }]}
              >
                {String(h)}
              </Text>
            ))}
          </View>

          {rows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={[
                styles.tableRow,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: rIdx % 2 === 1 ? colors.cardAlt : 'transparent',
                },
              ]}
            >
              {(Array.isArray(row) ? row : []).map((cell, cIdx) => (
                <Text
                  key={cIdx}
                  style={[
                    styles.tdCell,
                    {
                      color: colors.text,
                      fontFamily: cIdx === 0 ? 'outfit-bold' : 'outfit',
                    },
                  ]}
                >
                  {String(cell ?? '')}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontFamily: 'outfit-bold',
    fontSize: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  thCell: {
    width: 130,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontFamily: 'outfit-bold',
    fontSize: 13,
  },
  tdCell: {
    width: 130,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});
