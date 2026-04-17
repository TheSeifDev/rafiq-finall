import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Animated
} from 'react-native';
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Manrope_400Regular, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

interface WelcomeScreenProps {
  onLoginPress: () => void;
  onRegisterPress: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLoginPress, onRegisterPress }) => {
  const { colors, isDarkMode } = useTheme();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
  });

  const fadeTop = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const fadeTexts = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeTop, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true
    }).start();

    Animated.spring(logoScale, {
      toValue: 1,
      delay: 400,
      useNativeDriver: true
    }).start();

    Animated.timing(fadeTexts, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true
    }).start();

    Animated.timing(buttonsAnim, {
      toValue: 1,
      duration: 800,
      delay: 1000,
      useNativeDriver: true
    }).start();

  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={[styles.topDecorator, { backgroundColor: colors.primary + '10' }]} />

      <View style={styles.content}>
        
        <Animated.View style={{
          opacity: fadeTop,
          transform: [{
            translateY: fadeTop.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })
          }]
        }}>
          <Text style={[styles.welcomeText, { color: colors.subText }]}>
            مرحباً بك في
          </Text>
        </Animated.View>

        <View style={styles.logoContainer}>
          
          <Animated.View style={[
            styles.logoWrapper,
            { transform: [{ scale: logoScale }] }
          ]}>
            <Image 
              source={require('../../assets/white.jpeg')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.Text 
            style={[
              styles.brandName,
              {
                color: colors.text,
                opacity: fadeTexts,
                transform: [{
                  translateY: fadeTexts.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            Rafiq
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.tagline,
              {
                color: colors.primary,
                opacity: fadeTexts,
                transform: [{
                  translateY: fadeTexts.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            صحتك.. في يدٍ أمينة
          </Animated.Text>

        </View>
      </View>
      <Animated.View 
        style={[
          styles.buttonContainer,
          {
            opacity: buttonsAnim,
            transform: [{
              translateY: buttonsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={onLoginPress} 
        >
          <Text style={styles.primaryButtonText}>تسجيل دخول</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.navBorder }]}
          activeOpacity={0.7}
          onPress={onRegisterPress} 
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            إنشاء حساب جديد
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.footerText, { color: colors.subText }]}>
          v2.0.4 • Rafiq Health Ecosystem
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  topDecorator: {
    position: 'absolute',
    top: -SW * 0.2,
    right: -SW * 0.2,
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  welcomeText: { 
    fontSize: 18, 
    fontFamily: 'Manrope_400Regular', 
    letterSpacing: 2,
    marginBottom: 10
  },
  logoContainer: { alignItems: 'center' },
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  logoImage: { width: 2500, height: 140 },
  brandName: { 
    fontSize: 56, 
    fontFamily: 'SpaceGrotesk_700Bold', 
    marginTop: 20, 
    letterSpacing: -2 
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: -5,
    opacity: 0.9
  },
  buttonContainer: { width: '100%', paddingHorizontal: 35, paddingBottom: 50 },
  primaryButton: { 
    height: 62, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 10,
    elevation: 4
  },
  secondaryButton: { 
    height: 62, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 10, 
    borderWidth: 1.5 
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  secondaryButtonText: { fontSize: 17, fontWeight: '600' },
  footerText: { 
    textAlign: 'center', 
    fontSize: 11, 
    marginTop: 25, 
    fontFamily: 'Manrope_400Regular',
    opacity: 0.5
  }
});

export default WelcomeScreen;