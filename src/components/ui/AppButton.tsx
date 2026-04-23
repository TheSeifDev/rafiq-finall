import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp, // ← ADDED
} from 'react-native';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'inverted' | 'outlined';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>; // ← FIXED: StyleProp<ViewStyle> بدل ViewStyle
  textStyle?: TextStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: Props) {
  const textColor: Record<ButtonVariant, string> = {
    primary: '#0A0F1C',
    secondary: '#FFFFFF',
    tertiary: '#FFFFFF',
    inverted: '#0A0F1C',
    outlined: '#FFFFFF',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[variant],
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <AppText
          style={[
            styles.text,
            { color: textColor[variant] },
            textStyle,
          ]}
        >
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#00C2FF',
  },
  secondary: {
    backgroundColor: '#1E3A8A',
  },
  tertiary: {
    backgroundColor: '#FF3B3B',
  },
  inverted: {
    backgroundColor: '#FFFFFF',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});