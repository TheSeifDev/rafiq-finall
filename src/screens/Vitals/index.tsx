import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer, LoadingOverlay, EmptyState } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { patientService } from '../../services/patient.service';
import { vitalsService } from '../../services/vitals.service';
import { spacing, radius } from '../../theme';
import type { PatientHealth } from '../../types/database';

// --------- Vital Item ---------
function VitalItem({ item, colors }: { item: PatientHealth; colors: { card: string; text: string; textSecondary: string; accentCyan: string; accentGreen: string; accentRed: string; border: string } }) {
  const date = new Date(item.created_at);
  const formattedDate = date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AppCard style={styles.vitalItem}>
      <View style={styles.vitalHeader}>
        <AppText variant="caption" color={colors.textSecondary}>
          {formattedDate} — {formattedTime}
        </AppText>
      </View>
      <Spacer size="sm" />
      <View style={styles.vitalGrid}>
        <VitalMetric
          icon="heart-pulse"
          label="النبض"
          value={`${item.heart_rate}`}
          unit="bpm"
          color={colors.accentRed}
        />
        {item.oxygen_level != null && (
          <VitalMetric
            icon="water"
            label="الأوكسجين"
            value={`${item.oxygen_level}`}
            unit="%"
            color={colors.accentCyan}
          />
        )}
        {item.blood_pressure && (
          <VitalMetric
            icon="gauge"
            label="الضغط"
            value={item.blood_pressure}
            unit="mmHg"
            color={colors.accentGreen}
          />
        )}
        {item.temperature != null && (
          <VitalMetric
            icon="thermometer"
            label="الحرارة"
            value={`${item.temperature}`}
            unit="°C"
            color="#F59E0B"
          />
        )}
      </View>
    </AppCard>
  );
}

function VitalMetric({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <AppText variant="caption" color={color} style={{ marginTop: 2 }}>
        {label}
      </AppText>
      <AppText variant="label" style={{ marginTop: 2 }}>
        {value} <AppText variant="caption">{unit}</AppText>
      </AppText>
    </View>
  );
}

// --------- Vitals Screen ---------
export default function VitalsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [history, setHistory] = useState<PatientHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const patientId = await patientService.getPatientId(user.id);
        if (patientId) {
          const data = await vitalsService.getVitalsHistory(patientId);
          setHistory(data);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const renderItem = useCallback(
    ({ item }: { item: PatientHealth }) => <VitalItem item={item} colors={colors} />,
    [colors]
  );

  if (loading) {
    return (
      <Screen>
        <LoadingOverlay label="جاري تحميل المؤشرات..." />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.header}>
          <AppText variant="h2">سجل المؤشرات الحيوية</AppText>
        </View>
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="heart-pulse" message="لا توجد بيانات مسجلة بعد" />
          }
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  vitalItem: {
    marginBottom: spacing.md,
  },
  vitalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  vitalGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    alignItems: 'center',
    minWidth: 70,
  },
});
