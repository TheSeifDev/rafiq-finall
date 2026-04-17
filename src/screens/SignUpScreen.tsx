import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Platform, 
  KeyboardAvoidingView, 
  StatusBar, 
  Alert, 
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; 
import { useTheme } from '../context/ThemeContext';

const { height: SH } = Dimensions.get('window');

interface SignUpProps {
  onGoToLogin: () => void;
}

const SignUpScreen: React.FC<SignUpProps> = ({ onGoToLogin }) => {
  const { colors, isDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start();

    Animated.timing(formAnim, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true
    }).start();
  }, []);

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !confirmPassword) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: fullName } }
    });
    setLoading(false);

    if (error) {
      Alert.alert('فشل إنشاء الحساب', error.message);
    } else {
      Alert.alert('تم بنجاح', 'حسابك جاهز الآن! يمكنك تسجيل الدخول.');
      onGoToLogin(); 
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#191D32' }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.topSection}>
        <Animated.Image 
          source={require('../../assets/black.jpeg')} 
          style={[
            styles.logo,
            {
              opacity: logoAnim,
              transform: [{
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0]
                })
              }]
            }
          ]}
          resizeMode="contain"
        />
        <View style={[styles.whiteCurve, { backgroundColor: colors.background }]} />
      </View>

      <View style={[styles.bottomSection, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <Animated.ScrollView 
            contentContainerStyle={styles.scrollContent}
            style={{
              opacity: formAnim,
              transform: [{
                translateY: formAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0]
                })
              }]
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.welcomeContainer}>
              <Text style={[styles.title, { color: colors.text }]}>إنشاء حساب جديد</Text>
              <Text style={[styles.subtitle, { color: colors.subText }]}>انضم إلى عائلة رفيق اليوم</Text>
            </View>

            <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={styles.tabBtn} onPress={onGoToLogin}>
                <Text style={[styles.tabText, { color: colors.subText }]}>دخول</Text>
              </TouchableOpacity>
              <View style={[styles.tabBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.tabText, { color: '#FFF', fontWeight: 'bold' }]}>تسجيل جديد</Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <InputBox icon="account-outline" placeholder="اسم المستخدم" val={fullName} set={setFullName} colors={colors} delay={0}/>
              <InputBox icon="email-outline" placeholder="البريد الإلكتروني" val={email} set={setEmail} keyboard="email-address" colors={colors} delay={100}/>
              <InputBox icon="lock-outline" placeholder="كلمة المرور" val={password} set={setPassword} secure colors={colors} delay={200}/>
              <InputBox icon="lock-check-outline" placeholder="تأكيد كلمة المرور" val={confirmPassword} set={setConfirmPassword} secure colors={colors} delay={300}/>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.primary }]} 
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>إنشاء الحساب</Text>
                  <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const InputBox = ({ icon, placeholder, val, set, secure, keyboard, colors, delay }: any) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.inputWrapper,
        { 
          backgroundColor: colors.card,
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} style={styles.inputIcon} />
      <TextInput 
        style={[styles.input, { color: colors.text }]} 
        placeholder={placeholder}
        placeholderTextColor={colors.subText + '90'}
        value={val}
        onChangeText={set}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoCapitalize="none"
        textAlign="right"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { height: SH * 0.28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  logo: { width: 120, height: 120, zIndex: 10, marginTop: -20 },
  whiteCurve: { position: 'absolute', bottom: -50, width: '120%', height: 100, borderRadius: 100, transform: [{ scaleX: 1.5 }] },
  bottomSection: { flex: 1, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 25, zIndex: 5 },
  scrollContent: { paddingBottom: 50 },
  welcomeContainer: { alignItems: 'center', marginTop: 30, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 5, opacity: 0.8 },
  tabContainer: { flexDirection: 'row-reverse', borderRadius: 25, marginVertical: 25, height: 55, padding: 5 },
  tabBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  tabText: { fontSize: 15 },
  formContainer: { width: '100%', gap: 12 },
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'center', height: 60, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  inputIcon: { marginLeft: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  submitButton: { width: '100%', height: 60, borderRadius: 18, marginTop: 30, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});

export default SignUpScreen;