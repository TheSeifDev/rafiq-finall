/**
 * ScreenContainer — Reusable screen wrapper with consistent spacing
 * Uses SafeAreaView and applies layout constants
 */
import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, spacing } from '../../theme/layout';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  centered?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  scrollable = false,
  keyboardAvoiding = false,
  centered = false,
  noPadding = false,
  style,
  edges = ['top', 'bottom'],
}: ScreenContainerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const contentStyle: ViewStyle = {
    paddingHorizontal: noPadding ? 0 : layout.screenHorizontal,
    paddingTop: noPadding ? 0 : layout.screenTop,
    paddingBottom: insets.bottom + layout.screenBottom,
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'transparent',
  };

  if (keyboardAvoiding) {
    return (
      <SafeAreaView style={containerStyle} edges={edges}>
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {scrollable ? (
            <ScrollView
              contentContainerStyle={contentStyle}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={style}
            >
              {centered ? <View style={styles.centeredContent}>{children}</View> : children}
            </ScrollView>
          ) : (
            <View style={[contentStyle, style]}>
              {centered ? <View style={styles.centeredContent}>{children}</View> : children}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={style}
        >
          {centered ? <View style={styles.centeredContent}>{children}</View> : children}
        </ScrollView>
      ) : (
        <View style={[contentStyle, style]}>
          {centered ? <View style={styles.centeredContent}>{children}</View> : children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default ScreenContainer;