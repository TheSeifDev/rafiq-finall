import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
  onToggleSecure?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function AppInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  textContentType,
  isPassword,
  onToggleSecure,
  containerStyle,
  inputStyle,
  icon,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const { colors, darkMode, isRTL } = useTheme();

  const fieldBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const fieldBorder = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const focusBg = darkMode ? 'rgba(0,194,255,0.06)' : 'rgba(0,119,200,0.04)';
  const labelColor = darkMode ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.55)';
  const placeholderColor = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)';
  const textAlign = isRTL ? 'right' as const : 'left' as const;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <AppText style={[styles.label, { color: labelColor, textAlign }]}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.field,
          { backgroundColor: fieldBg, borderColor: fieldBorder },
          focused && { borderColor: colors.secondary, backgroundColor: focusBg },
        ]}
      >
        {icon && !isPassword && <View style={styles.leftIcon}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, textAlign },
            inputStyle,
            (icon && !isPassword) ? { paddingLeft: 8 } : {},
          ]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.secondary}
          textAlign={textAlign}
          {...rest}
        />

        {isPassword && onToggleSecure && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.icon} activeOpacity={0.7}>
            <Ionicons
              name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  leftIcon: {
    marginRight: 8,
  },
  icon: {
    padding: 6,
    marginLeft: 4,
  },
});