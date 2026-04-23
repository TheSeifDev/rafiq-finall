import React from 'react';
import { RootNavigator } from './RootNavigator';

/**
 * @deprecated Keep only as a compatibility wrapper.
 * Canonical navigation now lives in RootNavigator and is mounted once in App.tsx.
 */
export function AppNavigator() {
  return <RootNavigator />;
}
