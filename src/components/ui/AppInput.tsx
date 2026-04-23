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
import { AppText } from './AppText';

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

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <AppText style={styles.label}>{label}</AppText>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon && !isPassword && <View style={styles.leftIcon}>{icon}</View>}
        
        <TextInput
          style={[
            styles.input,
            inputStyle,
            (icon && !isPassword) ? { paddingLeft: 8 } : {}, // ← FIXED: {} بدل undefined
          ]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor="#00C2FF"
          textAlign="right"
          {...rest}
        />
        
        {isPassword && onToggleSecure && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.icon} activeOpacity={0.7}>
            <AppText style={styles.iconText}>
              {secureTextEntry ? '👁' : '🙈'}
            </AppText>
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
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textAlign: 'right',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
  },
  fieldFocused: {
    borderColor: '#00C2FF',
    backgroundColor: 'rgba(0, 194, 255, 0.06)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
    height: '100%',
  },
  leftIcon: {
    marginRight: 8,
  },
  icon: {
    padding: 6,
    marginLeft: 4,
  },
  iconText: {
    fontSize: 18,
  },
});