/**
 * Health Tip Card Component
 * Shows contextual health information from user's data
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HealthContext {
  vitals?: {
    heartRate?: number;
    bloodPressure?: string;
    oxygenSaturation?: number;
  };
  medications?: string[];
}

interface HealthTipCardProps {
  context: HealthContext;
  isRTL?: boolean;
}

export function HealthTipCard({ context, isRTL = false }: HealthTipCardProps) {
  const hasVitals = context.vitals && (
    context.vitals.heartRate ||
    context.vitals.bloodPressure ||
    context.vitals.oxygenSaturation
  );

  if (!hasVitals && (!context.medications || context.medications.length === 0)) {
    return null;
  }

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🏥</Text>
          <Text style={[styles.headerText, isRTL && styles.headerTextRTL]}>
            {isRTL ? 'بياناتك الصحية' : 'Your Health Data'}
          </Text>
        </View>

        {context.vitals && (
          <View style={styles.vitalsRow}>
            {context.vitals.heartRate && (
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>{isRTL ? 'النبض' : 'Heart Rate'}</Text>
                <Text style={styles.vitalValue}>{context.vitals.heartRate} bpm</Text>
              </View>
            )}
            {context.vitals.bloodPressure && (
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>{isRTL ? 'الضغط' : 'Blood Pressure'}</Text>
                <Text style={styles.vitalValue}>{context.vitals.bloodPressure}</Text>
              </View>
            )}
            {context.vitals.oxygenSaturation && (
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>{isRTL ? 'الأكسجين' : 'SpO2'}</Text>
                <Text style={styles.vitalValue}>{context.vitals.oxygenSaturation}%</Text>
              </View>
            )}
          </View>
        )}

        {context.medications && context.medications.length > 0 && (
          <View style={styles.medsSection}>
            <Text style={[styles.medsTitle, isRTL && styles.medsTitleRTL]}>
              {isRTL ? 'الأدوية الحالية:' : 'Current Medications:'}
            </Text>
            <Text style={styles.medsList}>
              {context.medications.join(' • ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  headerTextRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  vitalItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  vitalLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  medsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  medsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  medsTitleRTL: {
    textAlign: 'right',
  },
  medsList: {
    fontSize: 13,
    color: '#475569',
  },
});

export default HealthTipCard;