import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Button({ text, type = 'fill', onPress, loading }) {
  const { colors } = useTheme();
  const isFill = type === 'fill';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 15,
        width: '100%',
        borderRadius: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: isFill ? colors.primary : colors.card,
        opacity: loading ? 0.8 : 1,
      }}
      disabled={loading}
    >
      {!loading ? (
        <Text
          style={{
            textAlign: 'center',
            fontSize: 17,
            color: isFill ? colors.white : colors.primary,
            fontFamily: 'outfit-bold',
          }}
        >
          {text}
        </Text>
      ) : (
        <ActivityIndicator
          size={'small'}
          color={isFill ? colors.white : colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}
