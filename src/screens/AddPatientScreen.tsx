import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, TextInput, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface AddPatientProps {
  onSuccess: () => void; 
}

const AddPatientScreen = ({ onSuccess }: AddPatientProps) => {
  const { colors, isDarkMode } = useTheme();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male'); 
  const [bloodType, setBloodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleAddPatient = async () => {
    if (!name || !age) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المريض وعمره على الأقل');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('patients')
        .insert([{
          name: name,
          age: parseInt(age),
          gender: gender,
          blood_type: bloodType,
          user_id: userId,
        }]);

      if (error) throw error;

      Alert.alert('تم بنجاح', 'تمت إضافة بيانات المريض');
      onSuccess(); 
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconHeader, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="account-plus" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>إضافة مريض جديد</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>بيانات الشخص الخاضع للرعاية</Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>الاسم الكامل</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background, 
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0', 
                  color: colors.text 
                }]}
                placeholder="مثال: محمد أحمد علي"
                placeholderTextColor={colors.subText + '70'}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>العمر</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background, 
                    borderColor: isDarkMode ? '#334155' : '#E2E8F0', 
                    color: colors.text 
                  }]}
                  placeholder="سنوات"
                  placeholderTextColor={colors.subText + '70'}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={{ width: 15 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>فصيلة الدم</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background, 
                    borderColor: isDarkMode ? '#334155' : '#E2E8F0', 
                    color: colors.text 
                  }]}
                  placeholder="مثال: A+"
                  placeholderTextColor={colors.subText + '70'}
                  value={bloodType}
                  onChangeText={setBloodType}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.text, marginBottom: 12 }]}>الجنس</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[
                  styles.genderBtn, 
                  { 
                    backgroundColor: gender === 'male' ? colors.primary : colors.background, 
                    borderColor: gender === 'male' ? colors.primary : (isDarkMode ? '#334155' : '#E2E8F0') 
                  }
                ]}
                onPress={() => setGender('male')}
              >
                <MaterialCommunityIcons name="human-male" size={24} color={gender === 'male' ? '#FFF' : colors.subText} />
                <Text style={[styles.genderText, { color: gender === 'male' ? '#FFF' : colors.subText }]}>ذكر</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={0.8}
                style={[
                  styles.genderBtn, 
                  { 
                    backgroundColor: gender === 'female' ? colors.primary : colors.background, 
                    borderColor: gender === 'female' ? colors.primary : (isDarkMode ? '#334155' : '#E2E8F0') 
                  }
                ]}
                onPress={() => setGender('female')}
              >
                <MaterialCommunityIcons name="human-female" size={24} color={gender === 'female' ? '#FFF' : colors.subText} />
                <Text style={[styles.genderText, { color: gender === 'female' ? '#FFF' : colors.subText }]}>أنثى</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              activeOpacity={0.9}
              style={[styles.submitBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} 
              onPress={handleAddPatient}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                   <MaterialCommunityIcons name="check-bold" size={22} color="#FFF" />
                   <Text style={styles.submitBtnText}>حفظ المريض</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 25 },
  header: { marginBottom: 35, alignItems: 'center', marginTop: 10 },
  iconHeader: { width: 70, height: 70, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 15, marginTop: 5, opacity: 0.7 },
  form: { 
    borderRadius: 30, 
    padding: 25, 
    elevation: 4, 
    shadowOpacity: 0.1, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 5 } 
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10, textAlign: 'right' },
  input: { 
    borderWidth: 1.5, 
    borderRadius: 15, 
    padding: 16, 
    fontSize: 16, 
    textAlign: 'right',
    fontWeight: '500'
  },
  row: { flexDirection: 'row-reverse' },
  genderContainer: { flexDirection: 'row-reverse', gap: 12, marginBottom: 35 },
  genderBtn: { 
    flex: 1, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 15, 
    borderWidth: 1.5, 
    gap: 8 
  },
  genderText: { fontWeight: '800', fontSize: 15 },
  submitBtn: { 
    borderRadius: 20, 
    paddingVertical: 18, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 6,
    marginTop: 5
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});

export default AddPatientScreen;