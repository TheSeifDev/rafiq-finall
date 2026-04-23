import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Screen } from '../components/ui/Screen';

export function RootNavigator(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <Screen>
        <LoadingOverlay text="جاري التحميل..." />
      </Screen>
    );
  }

  return session ? <MainNavigator /> : <AuthNavigator />;
}
