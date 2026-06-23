import React, { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, ViewStyle, StyleProp } from 'react-native';

interface AnimatedTouchableProps extends TouchableOpacityProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export default function AnimatedTouchable({ 
  onPress, 
  style, 
  children, 
  disabled, 
  scaleTo = 0.95,
  ...rest 
}: AnimatedTouchableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.6 }]}>
      <TouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={style}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
