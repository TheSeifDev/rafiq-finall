/**
 * Error Boundary — Catches JS errors at the component level.
 * Provides graceful fallback UI instead of a blank screen crash.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../theme/useTheme';
import { logger } from '../lib/logger';
import { useAppStore } from '../store/app.store';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(`[ErrorBoundary] Caught error in "${this.props.name ?? 'Unknown'}"`, {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: info.componentStack,
    }, 'ErrorBoundary');
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error | null }): React.JSX.Element {
  const { colors } = useTheme();
  const language = useAppStore((s) => s.language);
  const isAr = language === 'ar';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.danger + '14' }]}>
        <Ionicons name="warning" size={48} color={colors.danger} />
      </View>
      <AppText style={[styles.title, { color: colors.textPrimary }]}>
        {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
      </AppText>
      <AppText style={[styles.message, { color: colors.textSecondary }]}>
        {isAr
          ? 'نأسف على الإزعاج. يرجى إعادة تشغيل التطبيق.'
          : 'We\'re sorry for the inconvenience. Please restart the app.'}
      </AppText>
      {__DEV__ && error && (
        <View style={[styles.devBox, { backgroundColor: colors.danger + '08', borderColor: colors.danger + '20' }]}>
          <AppText style={[styles.devText, { color: colors.danger }]} numberOfLines={6}>
            {error.message}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  devBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
  },
  devText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
});