import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, FlatList, ActivityIndicator, StatusBar,
  Dimensions, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

interface VitalsScreenProps {
  onBack: () => void;
}

export default function VitalsScreen({ onBack }: VitalsScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchVitalsHistory();
  }, []);

  const fetchVitalsHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (patient) {
        const { data, error } = await supabase
          .from('patient_health')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Item ─────────────────────────────────────────
  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const date = new Date(item.created_at);
    const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true
      }).start();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.card,
          { 
            backgroundColor: colors.card,
            opacity: anim,
            transform: [{
              translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0] 
              })
            }]
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.timeTag, { backgroundColor: colors.background }]}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.primary} />
            <Text style={[styles.timeText, { color: colors.text }]}>{timeStr}</Text>
          </View>
          <Text style={[styles.cardDate, { color: colors.subText }]}>{dateStr}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.vitalBox}>
            <View style={[styles.iconCircle, { backgroundColor: '#FF3B3B15' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={22} color="#FF3B3B" />
            </View>
            <View style={styles.vitalData}>
              <Text style={[styles.vitalValue, { color: colors.text }]}>{item.heart_rate}</Text>
              <Text style={[styles.vitalLabel, { color: colors.subText }]}>نبض/دقيقة</Text>
            </View>
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.navBorder }]} />

          <View style={styles.vitalBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons name="water-percent" size={24} color={colors.primary} />
            </View>
            <View style={styles.vitalData}>
              <Text style={[styles.vitalValue, { color: colors.text }]}>
                {item.oxygen_level || '--'}
                <Text style={styles.unitText}>%</Text>
              </Text>
              <Text style={[styles.vitalLabel, { color: colors.subText }]}>نسبة الأكسجين</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ─── Empty State Animation ───────────────────────
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(emptyAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, [loading]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { borderBottomColor: colors.navBorder }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>سجل المؤشرات</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="filter-variant" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>جاري تحميل السجلات...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View 
              style={[
                styles.emptyContainer,
                {
                  opacity: emptyAnim,
                  transform: [{
                    translateY: emptyAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0]
                    })
                  }]
                }
              ]}
            >
              <MaterialCommunityIcons name="clipboard-text-outline" size={80} color={colors.subText + '30'} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                لا توجد سجلات حيوية متاحة حالياً
              </Text>
            </Animated.View>
          }
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1 
  },

  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 1 
  },

  listContent: { padding: 20, paddingBottom: 40 },

  card: { 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 16, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },

  cardHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },

  timeTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    gap: 4
  },

  timeText: { fontSize: 11, fontWeight: 'bold' },

  cardDate: { fontSize: 12, fontWeight: '600' },

  cardBody: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  vitalBox: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    flex: 1,
    gap: 12 
  },

  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  vitalData: { alignItems: 'flex-end' },

  vitalValue: { fontSize: 20, fontWeight: 'bold' },

  unitText: { fontSize: 14, fontWeight: 'normal' },

  vitalLabel: { fontSize: 10, marginTop: 2, fontWeight: '500' },

  verticalDivider: { width: 1, height: 40, marginHorizontal: 10 },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  loadingText: { marginTop: 15, fontSize: 14 },

  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100, gap: 15 },

  emptyText: { fontSize: 14, textAlign: 'center' }
});