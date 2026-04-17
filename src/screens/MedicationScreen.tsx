import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  FlatList, Modal, TextInput, ActivityIndicator, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Medication {
  id: string;
  med_name: string;
  dosage: string;
  reminder_time: string;
  is_active: boolean;
}

interface Props {
  onBack: () => void;
  isDarkMode: boolean;
  lang: 'ar' | 'en';
}

export default function MedicationScreen({ onBack, isDarkMode, lang }: Props) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // States للنموذج الجديد
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  const isRTL = lang === 'ar';
  const theme = {
    bg: isDarkMode ? '#121212' : '#F8FAFC',
    card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#191D32',
    border: isDarkMode ? '#2D2D2D' : '#E8EDF5',
  };

  useEffect(() => {
    fetchMeds();
  }, []);

  const fetchMeds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      
      if (patient) {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .eq('patient_id', patient.id)
          .order('reminder_time', { ascending: true });
        
        if (data) setMeds(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const addMedication = async () => {
    if (!newName) return Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "برجاء كتابة اسم الدواء" : "Please enter med name");

    try {
      const { data: { user } } = await supabase.auth.getUser();
const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user?.id).single();
      const { error } = await supabase.from('medications').insert([
        { 
          patient_id: patient?.id, 
          med_name: newName, 
          dosage: newDosage, 
          reminder_time: newTime 
        }
      ]);

      if (!error) {
        setModalVisible(false);
        setNewName('');
        setNewDosage('');
        fetchMeds();
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name={isRTL ? "arrow-right" : "arrow-left"} size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{isRTL ? 'صيدلية رفيق' : 'Rafiq Pharmacy'}</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0077C8" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={meds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={[styles.medCard, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.timeBadge, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F1F5F9' }]}>
                <Text style={{ color: '#0077C8', fontWeight: 'bold' }}>{item.reminder_time.substring(0,5)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 15 }}>
                <Text style={[styles.medName, { color: theme.text }]}>{item.med_name}</Text>
                <Text style={{ color: '#64748B' }}>{item.dosage}</Text>
              </View>
              <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#10B981" />
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 40 }}>
              {isRTL ? 'لا يوجد أدوية مضافة حالياً' : 'No medications added yet'}
            </Text>
          }
        />
      )}

      {/* Button Add */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Modal إضافة دواء */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{isRTL ? 'إضافة دواء جديد' : 'Add New Medicine'}</Text>
            
            <TextInput 
              placeholder={isRTL ? "اسم الدواء" : "Medicine Name"}
              placeholderTextColor="#94A3B8"
              style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign: isRTL ? 'right' : 'left' }]}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput 
              placeholder={isRTL ? "الجرعة (مثلاً: حبة واحدة)" : "Dosage (e.g. 1 Pill)"}
              placeholderTextColor="#94A3B8"
              style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign: isRTL ? 'right' : 'left' }]}
              value={newDosage}
              onChangeText={setNewDosage}
            />
            <TextInput 
              placeholder={isRTL ? "الوقت (09:00)" : "Time (09:00)"}
              placeholderTextColor="#94A3B8"
              style={[styles.input, { color: theme.text, borderColor: theme.border, textAlign: isRTL ? 'right' : 'left' }]}
              value={newTime}
              onChangeText={setNewTime}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#F1F5F9' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#64748B' }}>{isRTL ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#0077C8' }]} onPress={addMedication}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{isRTL ? 'حفظ' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: 'bold' },
  medCard: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  timeBadge: { padding: 8, borderRadius: 10 },
  medName: { fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0077C8', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 25, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 15 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});