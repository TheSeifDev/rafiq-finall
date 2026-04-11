import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import { User } from '@supabase/supabase-js'

export default function App() {
  const [user, setUser] = useState<User | null>(null)

  const loadUser = async () => {
    // استخدمنا getUser بدل getSession عشان دي بتكلم السيرفر وتتأكد إن اليوزر لسه موجود بجد
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      setUser(null)
    } else {
      setUser(user)
    }
  }

  useEffect(() => {
    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // دالة تسجيل الخروج عشان تمسح الكاش
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <View style={{ marginTop: 50, padding: 20 }}>
      {!user ? (
        <Auth />
      ) : (
        <View>
          <Text style={{ marginTop: 20, marginBottom: 20, fontSize: 16 }}>
            User ID: {user.id}
          </Text>
          
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: '#ff3b30', // لون أحمر يعبر عن الخروج
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
})