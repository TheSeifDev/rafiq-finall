import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Screen, AppText, AppButton, AppInput, Spacer, ErrorMessage } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { patientService } from '../../services/patient.service';
import { spacing } from '../../theme';
import { toFiniteNumberOrNull } from '../../utils/number';

export default function AddPatientScreen() {
  const { colors } = useTheme();
  const { user, refreshPatientStatus } = useAuth();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [bloodType, setBloodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleSubmit = async () => {
    console.log("1. بدء عملية الحفظ...");
    setError('');

    if (!fullName.trim() || !age.trim() || !gender || !bloodType.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    const parsedAge = toFiniteNumberOrNull(age);
    if (parsedAge === null || !Number.isInteger(parsedAge) || parsedAge <= 0) {
      setError('Please enter a valid positive whole-number age');
      return;
    }

    setLoading(true);
    try {
      console.log("2. إرسال البيانات للـ Backend...");
      const result = await patientService.createPatient({
        user_id: user.id,
        full_name: fullName.trim(),
        age: parsedAge,
        gender,
        blood_type: bloodType.trim(),
      });

      console.log("3. الرد وصل:", result);

      if (result.error) {
        console.log("4. يوجد خطأ من السيرفر:", result.error);
        setError(result.error);
      } else {
        console.log("5. تم الحفظ بنجاح، جاري تحديث الحالة...");
        await refreshPatientStatus();
        console.log("6. تم التحديث بنجاح!");
      }
    } catch (err) {
      console.error("7. حدث خطأ مفاجئ (Catch):", err);
      setError('حدث خطأ. يرجى المحاولة لاحقاً');
    } finally {
      console.log("8. إنهاء حالة التحميل (Finally)");
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <Screen scrollable>
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <AppText variant="h2" align="center">
              بيانات المريض
            </AppText>
            <Spacer size="xs" />
            <AppText variant="bodySmall" color={colors.textSecondary} align="center">
              أدخل بياناتك لبدء المراقبة الصحية
            </AppText>

            <Spacer size="xl" />

            {error ? (
              <>
                <ErrorMessage message={error} />
                <Spacer size="md" />
              </>
            ) : null}

            <AppInput
              label="الاسم الكامل"
              placeholder="أدخل اسمك الكامل"
              icon="account-outline"
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
            />

            <AppInput
              label="العمر"
              placeholder="أدخل عمرك"
              icon="calendar-outline"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              returnKeyType="next"
            />

            <AppText variant="label" style={{ marginBottom: spacing.sm }}>
              الجنس
            </AppText>
            <View style={styles.genderRow}>
              <GenderOption
                label="أنثى"
                selected={gender === 'female'}
                onPress={() => setGender('female')}
                colors={colors}
              />
              <GenderOption
                label="ذكر"
                selected={gender === 'male'}
                onPress={() => setGender('male')}
                colors={colors}
              />
            </View>

            <Spacer size="md" />

            <AppInput
              label="فصيلة الدم"
              placeholder="مثلاً: A+"
              icon="water-outline"
              value={bloodType}
              onChangeText={setBloodType}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Spacer size="lg" />

            <AppButton
              label="حفظ البيانات"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              size="lg"
            />
          </Animated.View>
        </Screen>
      </View>
    </TouchableWithoutFeedback>
  );
}

function GenderOption({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: { primary: string; border: string; text: string; textInverse: string };
}) {
  return (
    <AppButton
      label={label}
      onPress={onPress}
      variant={selected ? 'primary' : 'secondary'}
      size="sm"
      style={{ flex: 1, marginHorizontal: spacing.xs }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  genderRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
});
