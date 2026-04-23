import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  activeValue: string;
  onChange: (value: string) => void;
}

export function SegmentedToggle({ options, activeValue, onChange }: Props) {
  const { colors, darkMode } = useTheme();

  const trackBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const trackBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inactiveText = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';

  return (
    <View style={[styles.container, { backgroundColor: trackBg, borderColor: trackBorder }]}>
      {options.map((option) => {
        const isActive = option.value === activeValue;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[styles.pill, isActive && [styles.activePill, { backgroundColor: colors.danger }]]}
          >
            <AppText
              style={[
                styles.text,
                { color: inactiveText },
                isActive && styles.activeText,
              ]}
            >
              {option.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    height: 50,
    borderWidth: 1,
  },
  pill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  activePill: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});