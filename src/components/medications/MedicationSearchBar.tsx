import React, { useCallback } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme';

export function MedicationSearchBar({
  value,
  onChange,
  placeholder,
  onPressFilter,
  filterActive,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  onPressFilter: () => void;
  filterActive: boolean;
}): React.JSX.Element {
  const { colors, darkMode, isRTL } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)';

  const handleChange = useCallback((text: string) => onChange(text), [onChange]);

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <View style={[styles.search, { backgroundColor: bg, borderColor: border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          textContentType="none"
          autoComplete="off"
        />
        {!!value && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={onPressFilter}
        activeOpacity={0.75}
        style={[
          styles.filterBtn,
          {
            backgroundColor: filterActive ? `${colors.primary}22` : bg,
            borderColor: filterActive ? `${colors.primary}55` : border,
          },
        ]}
      >
        <Ionicons name="options" size={18} color={filterActive ? colors.primary : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  search: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '600',
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
