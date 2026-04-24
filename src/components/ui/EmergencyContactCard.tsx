import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme';
import type { EmergencyContact } from '../../types/database';

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  onEdit: () => void;
  onDelete: () => void;
  isAr: boolean;
}

/**
 * Card displaying a single emergency contact with edit/delete controls.
 */
export function EmergencyContactCard({
  contact,
  onEdit,
  onDelete,
  isAr,
}: EmergencyContactCardProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const cardBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.cardTop}>
        <View style={styles.nameRow}>
          {contact.is_primary && (
            <Ionicons name="star" size={14} color="#F59E0B" style={styles.starIcon} />
          )}
          <AppText style={[styles.name, { color: colors.textPrimary }]}>
            {contact.name}
          </AppText>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
          <AppText style={[styles.metaText, { color: colors.textSecondary }]}>
            {contact.relation}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
          <AppText style={[styles.metaText, { color: colors.textSecondary }]}>
            {contact.phone}
          </AppText>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: colors.primary + '12' }]}>
          <AppText style={[styles.priorityText, { color: colors.primary }]}>
            #{contact.priority + 1}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.sm + 4,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  starIcon: {
    marginRight: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
