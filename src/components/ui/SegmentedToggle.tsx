import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';

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
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === activeValue;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[styles.pill, isActive && styles.activePill]}
          >
            <AppText style={[styles.text, isActive && styles.activeText]}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 4,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  activePill: {
    backgroundColor: '#FF3B3B',
    shadowColor: '#FF3B3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});