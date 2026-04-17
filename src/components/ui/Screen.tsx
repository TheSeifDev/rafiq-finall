import React from 'react';
import { View, ScrollView, StyleSheet, StatusBar, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../store/ThemeContext';
import { spacing } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  statusBarStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({
  children,
  scrollable = false,
  padded = true,
  style,
  statusBarStyle,
  backgroundColor,
  edges = ['top'],
}: ScreenProps) {
  const { colors, isDarkMode } = useTheme();
  const bg = backgroundColor ?? colors.background;
  const barStyle = statusBarStyle ?? (isDarkMode ? 'light-content' : 'dark-content');

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        padded && styles.padded,
        styles.scrollContent,
        style,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }]} edges={edges}>
      <StatusBar barStyle={barStyle} backgroundColor={bg} />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
});
