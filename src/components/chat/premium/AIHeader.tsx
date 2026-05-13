/**
 * AI Header
 * Premium header for AI chat screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIHeaderProps {
  isRTL?: boolean;
  colors?: any;
}

export function AIHeader({ isRTL = false, colors }: AIHeaderProps) {
  const bgColor = colors?.surface || '#ffffff';
  const textColor = colors?.textPrimary || '#1e293b';
  const secondaryColor = colors?.textSecondary || '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="heart" size={22} color="#4a6fa5" />
          </View>
          {/* Online indicator */}
          <View style={styles.onlineDot} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>RAFIQ AI</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={[styles.status, { color: secondaryColor }]}>
              {isRTL ? 'متصل' : 'Online'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right side - could add settings or menu */}
      <View style={styles.rightContent}>
        <Ionicons name="settings-outline" size={22} color={secondaryColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  textContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  status: {
    fontSize: 12,
  },
  rightContent: {
    padding: 4,
  },
});

export default AIHeader;