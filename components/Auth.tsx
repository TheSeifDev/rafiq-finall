import React, { useState } from 'react'
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('') 
  const [loading, setLoading] = useState(false)

  // دالة تسجيل الدخول
  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد وكلمة المرور');
      return;
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert('خطأ', error.message)
    setLoading(false)
  }

  // دالة إنشاء حساب جديد (محدثة لترسل الاسم للـ Trigger)
  async function signUpWithEmail() {
    if (!email || !password || !fullName) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الخانات بما فيها الاسم');
      return;
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName, // ده اللي هيروح لجدول profiles
        },
      },
    })

    if (error) {
      Alert.alert('خطأ في التسجيل', error.message)
    } else {
      if (!data.session) {
        Alert.alert('نجاح', 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب');
      }
    }
    setLoading(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>أهلاً بك في رفيق</Text>

      {/* خانة الاسم بالكامل */}
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>الاسم بالكامل</Text>
        <TextInput
          onChangeText={setFullName}
          value={fullName}
          placeholder="أدخل اسمك الثلاثي"
          style={styles.input}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>البريد الإلكتروني</Text>
        <TextInput
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>كلمة المرور</Text>
        <TextInput
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تسجيل الدخول</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity
          style={[styles.buttonOutline, loading && styles.buttonDisabled]}
          onPress={signUpWithEmail}
          disabled={loading}
        >
          <Text style={styles.buttonOutlineText}>إنشاء حساب جديد</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#191D32',
    textAlign: 'center',
    marginBottom: 30,
  },
  verticallySpaced: {
    paddingVertical: 8,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#0077C8', // لون رفيق المعتمد
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0077C8',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonOutlineText: {
    color: '#0077C8',
    fontSize: 16,
    fontWeight: 'bold',
  },
})