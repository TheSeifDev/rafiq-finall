/**
 * Suggestion Chips
 * Modern quick action buttons for chat
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isRTL?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, isRTL = false }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={`suggestion-${index}`}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
              isRTL && styles.chipRTL,
            ]}
            onPress={() => onSelect(suggestion)}
          >
            <Text style={[styles.chipText, isRTL && styles.chipTextRTL]}>
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipRTL: {
    flexDirection: 'row-reverse',
  },
  chipPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4a6fa5',
  },
  chipTextRTL: {
    textAlign: 'right',
  },
});

export default SuggestionChips;