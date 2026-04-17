import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingOverlay } from '../components/ui';
import { Screen } from '../components/ui';
import AddPatientScreen from '../screens/AddPatient';

export function AppNavigator() {
  const { isLoading, isAuthenticated, hasPatient } = useAuth();

  if (isLoading) {
    return (
      <Screen>
        <LoadingOverlay label="جاري التحميل..." />
      </Screen>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : !hasPatient ? (
        <AddPatientScreen />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}
