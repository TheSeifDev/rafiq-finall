import React, { useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { Screen, AppText, AppButton, Spacer } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { spacing } from '../../theme';
import type { AuthScreenProps } from '../../types/navigation';
import { Routes } from '../../navigation/routes';

export default function WelcomeScreen({ navigation }: AuthScreenProps<typeof Routes.Welcome>) {
  const { colors, isDarkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Screen style={{ flex: 1, backgroundColor: isDarkMode ? colors.background : '#191D32' }}>
      <View style={styles.container}>
        <Animated.View
          style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Image
            source={require('../../../assets/white.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText variant="h1" style={{ color: '#FFFFFF', textAlign: 'center' }}>
            مرحباً بك في رفيق
          </AppText>
          <Spacer size="sm" />
          <AppText variant="body" style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            رفيقك الصحي الذكي — يراقب، يُنبّه، ويُطمئنك.
          </AppText>
        </Animated.View>

        <Animated.View
          style={[styles.bottomSection, { opacity: fadeAnim }]}
        >
          <AppButton
            title="تسجيل دخول"
            onPress={() => navigation.navigate(Routes.Login)}
            variant="primary"
          />
          <Spacer size="md" />
          <AppButton
            title="إنشاء حساب"
            onPress={() => navigation.navigate(Routes.SignUp)}
            variant="outlined"
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: spacing.lg,
  },
  bottomSection: {
    paddingBottom: spacing.lg,
  },
});