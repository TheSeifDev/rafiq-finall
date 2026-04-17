import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, ScrollView, Platform,
  TextInput, KeyboardAvoidingView, StatusBar,
  Dimensions, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type ScreenState = 'welcome' | 'login' | 'signup' | 'home' | 'settings' | 'profile' | 'chat' | 'generalSettings' | 'clinic';

interface ChatProps {
  onNavigate: (screen: ScreenState) => void;
}

const { width: SW } = Dimensions.get('window');

const ChatScreen: React.FC<ChatProps> = ({ onNavigate }) => {
  const { colors, isDarkMode } = useTheme();

  const botAnim = useRef(new Animated.Value(0)).current;

  const userAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(botAnim, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(userAnim, {
      toValue: 1,
      duration: 600,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#000' : '#191D32' }]}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#000' : '#191D32' }]}>
          <TouchableOpacity style={styles.headerCircleBtn} onPress={() => onNavigate('home')}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>مساعد رفيق</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>متصل الآن</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerCircleBtn}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.dateTimeContainer}>
            <View style={[styles.dateLine, { backgroundColor: colors.subText + '20' }]} />
            <Text style={[styles.dateText, { color: colors.subText }]}>اليوم، 16 أبريل</Text>
            <View style={[styles.dateLine, { backgroundColor: colors.subText + '20' }]} />
          </View>
          <Animated.View
            style={[
              styles.messageRow,
              {
                opacity: botAnim,
                transform: [{
                  translateX: botAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 0],
                  })
                }]
              }
            ]}
          >
            <View style={[styles.avatarWrapper, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
            </View>

            <View style={[styles.messageBubble, { backgroundColor: colors.card, borderBottomLeftRadius: 4 }]}>
              <Text style={[styles.messageText, { color: colors.text }]}>
                Welcome to <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Rafiq AI</Text> 🌟
              </Text>
              <Text style={[styles.messageText, styles.arabicText, { color: colors.text }]}>
                أهلاً بك! أنا مساعدك الذكي رفيق، كيف يمكنني مساعدتك اليوم؟
              </Text>

              <View style={styles.languageButtonsContainer}>
                <TouchableOpacity style={[styles.langBtn, { backgroundColor: colors.background, borderColor: colors.primary + '30', borderWidth: 1 }]}>
                  <Text style={[styles.langBtnText, { color: colors.text }]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.langBtn, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.langBtnText, { color: '#FFF' }]}>العربية</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeStamp}>10:27 PM</Text>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.messageRow,
              { flexDirection: 'row-reverse' },
              {
                opacity: userAnim,
                transform: [{
                  translateX: userAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  })
                }]
              }
            ]}
          >
            <View style={[styles.messageBubble, { backgroundColor: colors.primary, borderBottomRightRadius: 4 }]}>
              <Text style={[styles.messageText, { color: '#FFF', textAlign: 'right' }]}>
                أريد التحقق من معدل ضربات القلب
              </Text>
              <Text style={[styles.timeStamp, { color: 'rgba(255,255,255,0.7)', textAlign: 'left' }]}>
                10:28 PM
              </Text>
            </View>
          </Animated.View>

        </ScrollView>

        <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.attachButton}>
              <MaterialCommunityIcons name="plus" size={24} color={colors.subText} />
            </TouchableOpacity>

            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="اكتب رسالتك..."
              placeholderTextColor={colors.subText + '80'}
              multiline
            />

            <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.bottomNav, { backgroundColor: colors.card }]}>
          <NavIcon icon="cog-outline" label="الإعدادات" onPress={() => onNavigate('settings')} color={colors.subText} />
          <NavIcon icon="chat-processing" label="دردشة" onPress={() => onNavigate('chat')} color={colors.primary} active badge="1" />
          <NavIcon icon="stethoscope" label="العيادة" onPress={() => onNavigate('clinic')} color={colors.subText} />
          <NavIcon icon="heart-pulse" label="الرئيسية" onPress={() => onNavigate('home')} color={colors.subText} />
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const NavIcon = ({ icon, label, onPress, color, active, badge }: any) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.navText, { color, fontWeight: active ? 'bold' : 'normal' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 75, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', marginRight: 5 },
  onlineText: { fontSize: 10, color: '#4ADE80', fontWeight: '600' },
  chatArea: { flex: 1 },
  chatContent: { padding: 20 },
  dateTimeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  dateLine: { flex: 1, height: 1, marginHorizontal: 10 },
  dateText: { fontSize: 11, fontWeight: '600' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 },
  avatarWrapper: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginBottom: 5 },
  messageBubble: { maxWidth: SW * 0.75, borderRadius: 20, padding: 15, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  arabicText: { textAlign: 'right', marginTop: 8, fontWeight: '500' },
  timeStamp: { fontSize: 9, opacity: 0.5, marginTop: 5, textAlign: 'right' },
  languageButtonsContainer: { flexDirection: 'row', marginTop: 15, gap: 10 },
  langBtn: { paddingVertical: 8, flex: 1, borderRadius: 10, alignItems: 'center' },
  langBtnText: { fontWeight: 'bold', fontSize: 13 },
  inputWrapper: { paddingHorizontal: 15, paddingVertical: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 25 },
  textInput: { flex: 1, maxHeight: 100, paddingHorizontal: 12, fontSize: 15, textAlign: 'right' },
  attachButton: { padding: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  bottomNav: { flexDirection: 'row', height: 80, borderTopWidth: 1, paddingBottom: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { position: 'relative' },
  navText: { fontSize: 10, marginTop: 5 },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' }
});

export default ChatScreen;