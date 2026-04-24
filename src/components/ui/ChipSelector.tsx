import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

interface ChipSelectorProps {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  style?: ViewStyle;
}

/**
 * Multi-select chip grid. Used for medical conditions.
 * Each chip toggles on/off independently.
 */
export function ChipSelector({ options, selected, onToggle, style }: ChipSelectorProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();

  return (
    <View style={[styles.chipRow, style]}>
      {options.map(({ key, label }) => {
        const isActive = selected.includes(key);
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.7}
            onPress={() => onToggle(key)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? colors.primary + '18'
                  : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                borderColor: isActive ? colors.primary + '40' : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              },
            ]}
          >
            {isActive && (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.chipIcon} />
            )}
            <AppText
              style={[
                styles.chipText,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
