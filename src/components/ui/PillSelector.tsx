import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

interface PillSelectorProps {
  options: string[];
  selected: string | null;
  onSelect: (val: string) => void;
  style?: ViewStyle;
}

/**
 * Single-select pill/chip row. Used for blood type, gender, risk level, etc.
 */
export function PillSelector({ options, selected, onSelect, style }: PillSelectorProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();

  return (
    <View style={[styles.pillRow, style]}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.7}
            onPress={() => onSelect(opt)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive
                  ? colors.primary + '18'
                  : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                borderColor: isActive ? colors.primary + '40' : 'transparent',
              },
            ]}
          >
            <AppText
              style={[
                styles.pillText,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
