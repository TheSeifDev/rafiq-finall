import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StatusBar, 
  Platform 
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationsProps {
  onNavigate: (screen: any) => void;
}

export default function NotificationsScreen({ onNavigate }: NotificationsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { 
      paddingTop: Platform.OS === 'ios' ? insets.top : 20, 
      paddingBottom: insets.bottom 
    }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
      
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.topNavLeft} onPress={() => onNavigate('home')}>
          <Image source={{ uri: 'https://i.pravatar.cc/100?img=11' }} style={styles.avatar} />
          <Text style={styles.appName}>Aura Health</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <MaterialCommunityIcons name="close-circle-outline" size={28} color="#8A93A6" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.centerLabel}>CENTER</Text>
          <Text style={styles.pageTitle}>Notifications</Text>
        </View>

        {/* Critical Alerts Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleContainer}>
              <MaterialCommunityIcons name="alert-rhombus" size={20} color="#FF453A" style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: '#FF453A' }]}>Critical Alerts</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2 ACTIVE</Text>
            </View>
          </View>

          {/* Card 1 */}
          <View style={[styles.card, styles.criticalCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.criticalCardTitle}>High Heart Rate Detected</Text>
              <Text style={styles.timeAgo}>2m ago</Text>
            </View>
            <Text style={styles.cardDesc}>
              Your resting heart rate exceeded 110 BPM for 5 minutes.
            </Text>
            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.primaryButtonRed} onPress={() => onNavigate('vitals')}>
                <Text style={styles.primaryButtonText}>View Result</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2 */}
          <View style={[styles.card, styles.criticalCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.criticalCardTitle}>Abnormal Sleep Pattern</Text>
              <Text style={styles.timeAgo}>1h ago</Text>
            </View>
            <Text style={styles.cardDesc}>
              Significant respiratory rate fluctuation during REM cycle.
            </Text>
            <TouchableOpacity style={styles.outlineButtonRed} onPress={() => onNavigate('chat')}>
              <Text style={styles.outlineButtonTextRed}>Consult Specialist</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleContainer}>
              <MaterialCommunityIcons name="clock-time-four" size={20} color="#00C2FF" style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: '#00C2FF' }]}>Reminders</Text>
            </View>
          </View>

          {/* Medication Card */}
          <View style={styles.card}>
            <View style={styles.medicationRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="pill" size={24} color="#0A0E17" />
              </View>
              <View style={styles.medicationInfo}>
                <Text style={styles.cardTitle}>Evening Medication</Text>
                <Text style={styles.medicationDetails}>Lisinopril • 10mg • Due 8:00 PM</Text>
              </View>
              <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => onNavigate('clinic')}>
                <Text style={styles.secondaryButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* General Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleContainer}>
              <MaterialCommunityIcons name="message-text" size={20} color="#8A93A6" style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: '#8A93A6' }]}>General</Text>
            </View>
          </View>

          {/* Report Card */}
          <View style={styles.card}>
             <View style={styles.cardHeaderRow}>
               <View style={styles.reportTitleRow}>
                 <View style={styles.blueDot} />
                 <Text style={styles.cardTitle}>Weekly Wellness Report</Text>
               </View>
               <Text style={styles.timeAgo}>Yesterday</Text>
             </View>
             <Text style={styles.cardDesc}>
               Your recovery score improved by 12% this week!
             </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('home')}>
          <MaterialCommunityIcons name="home-outline" size={24} color="#8A93A6" />
          <Text style={styles.navText}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('vitals')}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color="#8A93A6" />
          <Text style={styles.navText}>VITALS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('emergency')}>
          <MaterialCommunityIcons name="shield-alert-outline" size={24} color="#8A93A6" />
          <Text style={styles.navText}>ALERT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('chat')}>
          <MaterialCommunityIcons name="chat-processing-outline" size={24} color="#8A93A6" />
          <Text style={styles.navText}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('profile')}>
          <View style={styles.profileNavActive}>
             <MaterialCommunityIcons name="account" size={28} color="#0A0E17" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  topNavLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  appName: { color: '#E2E8F0', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  titleContainer: { marginBottom: 30 },
  centerLabel: { color: '#00C2FF', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  sectionContainer: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeaderTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  badge: { backgroundColor: 'rgba(255, 69, 58, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#FF453A', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  card: { backgroundColor: '#1E2330', borderRadius: 24, padding: 20, marginBottom: 16 },
  criticalCard: { borderLeftWidth: 4, borderLeftColor: '#FF453A' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  criticalCardTitle: { color: '#FF453A', fontSize: 16, fontWeight: '700', flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },
  timeAgo: { color: '#8A93A6', fontSize: 12, fontWeight: '500' },
  cardDesc: { color: '#A0A8B8', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  cardActionsRow: { flexDirection: 'row', gap: 12 },
  primaryButtonRed: { backgroundColor: '#FF453A', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, flex: 1, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryButton: { backgroundColor: '#2A2F3D', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, flex: 1, alignItems: 'center' },
  secondaryButtonText: { color: '#A0A8B8', fontWeight: '600', fontSize: 14 },
  outlineButtonRed: { borderWidth: 1, borderColor: '#FF453A', paddingVertical: 12, borderRadius: 30, alignItems: 'center', width: '100%' },
  outlineButtonTextRed: { color: '#FF453A', fontWeight: '600', fontSize: 14 },
  medicationRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00C2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  medicationInfo: { flex: 1 },
  medicationDetails: { color: '#8A93A6', fontSize: 13, marginTop: 4 },
  secondaryButtonSmall: { backgroundColor: '#2A2F3D', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginLeft: 8 },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C2FF', marginRight: 8 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0A0E17', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#1E2330' },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navText: { color: '#8A93A6', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  profileNavActive: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00C2FF', justifyContent: 'center', alignItems: 'center', bottom: 8 },
});