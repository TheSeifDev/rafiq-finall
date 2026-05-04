import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  /** Duration of the press-in animation in ms */
  duration?: number;
}

/**
 * A drop-in Pressable replacement with a subtle scale-down animation on press.
 * Provides tactile feedback making the app feel alive.
 */
export function AnimatedPressable({
  children,
  style,
  scaleValue = 0.96,
  duration = 100,
  disabled,
  ...rest
}: AnimatedPressableProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          if (!disabled) onPressIn();
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          onPressOut();
          rest.onPressOut?.(e);
        }}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
