import React from 'react';
import { View, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', padding: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#00000010' }}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        return (
          <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ color: isFocused ? colors.primary : colors.textSecondary }}>{String(label)}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
