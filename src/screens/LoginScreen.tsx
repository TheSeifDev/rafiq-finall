import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface LoginProps {
  onGoToSignup: () => void;
}

const LoginScreen: React.FC<LoginProps> = ({ onGoToSignup }) => {
  const { colors, isDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(tabAnim, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    Animated.timing(formAnim, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('فشل الدخول', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Animated.View
            style={{
              opacity: logoAnim,
              transform: [{
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                })
              }]
            }}
          >
            <Image
              source={require('../../assets/black.jpeg')}
              style={[styles.logo, isDarkMode && { tintColor: '#FFF' }]}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.tabContainer,
              {
                backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
                opacity: tabAnim,
                transform: [{
                  translateY: tabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  })
                }]
              }
            ]}
          >
            <View style={[styles.activeTabIndicator, { backgroundColor: colors.text }]} />

            <View style={styles.tabWrapper}>
              <View style={styles.tabItem}>
                <Text style={[styles.tabText, { color: colors.background, fontWeight: 'bold' }]}>
                  دخول
                </Text>
              </View>

              <TouchableOpacity style={styles.tabItem} onPress={onGoToSignup}>
                <Text style={[styles.tabText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                  حساب جديد
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.form,
              {
                opacity: formAnim,
                transform: [{
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  })
                }]
              }
            ]}
          >
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.text, textAlign: 'right' }]}>البريد الإلكتروني</Text>
              <TextInput
                style={[styles.input, { borderBottomColor: colors.text + '40', color: colors.text, textAlign: 'right' }]}
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={colors.subText + '80'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.text, textAlign: 'right' }]}>كلمة المرور</Text>
              <TextInput
                style={[styles.input, { borderBottomColor: colors.text + '40', color: colors.text, textAlign: 'right' }]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor={colors.subText + '80'}
              />
            </View>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleLogin}
                style={[styles.loginBtn, { backgroundColor: colors.text }]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.loginText, { color: colors.background }]}>
                    تسجيل الدخول
                  </Text>
                )}
              </Pressable>
            </Animated.View>
            <View style={styles.footerRow}>
              <TouchableOpacity>
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  نسيت كلمة المرور؟
                </Text>
              </TouchableOpacity>
              <View style={styles.rememberMeContainer}>
                <Text style={[styles.rememberText, { color: colors.subText }]}>
                  تذكرني
                </Text>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: "#CBD5E1", true: colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center'
  },
  logo: { width: 110, height: 110, borderRadius: 25, marginBottom: 30 },
  tabContainer: { width: '100%', height: 55, borderRadius: 18, marginBottom: 45, justifyContent: 'center' },
  tabWrapper: { flexDirection: 'row-reverse' }, // عكس الاتجاه ليتناسب مع العربية
  tabItem: { flex: 1, alignItems: 'center' },
  activeTabIndicator: { position: 'absolute', width: '48%', height: '80%', right: '1%', borderRadius: 15 }, // تغيير left إلى right
  tabText: { fontSize: 15 },
  form: { width: '100%' },
  inputWrapper: { marginBottom: 25 },
  inputLabel: { fontSize: 14, marginBottom: 10 },
  input: { borderBottomWidth: 1.5, paddingVertical: 12, fontSize: 16 },
  loginBtn: { borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
  loginText: { fontWeight: 'bold', fontSize: 17 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, alignItems: 'center' },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { fontSize: 13, marginRight: 8 }, // تغيير marginLeft إلى marginRight
  forgotText: { fontSize: 13 }
});

export default LoginScreen;