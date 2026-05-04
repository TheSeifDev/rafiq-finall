import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Returns animated values for a chat message entrance animation.
 * - Fades in from 0 → 1
 * - Slides up from translateY 12 → 0
 */
export function useMessageAnimation(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);

  return { opacity, translateY };
}
