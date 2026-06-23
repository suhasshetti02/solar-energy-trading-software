import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  visible: boolean;
  onHide: () => void;
}

const CONFIG = {
  success: { color: '#00FF94', bg: 'rgba(0,255,148,0.12)', icon: 'checkmark-circle' as const, borderColor: 'rgba(0,255,148,0.4)' },
  info:    { color: '#00D4FF', bg: 'rgba(0,212,255,0.12)', icon: 'information-circle' as const, borderColor: 'rgba(0,212,255,0.4)' },
  error:   { color: '#FF4D6D', bg: 'rgba(255,77,109,0.12)', icon: 'alert-circle' as const, borderColor: 'rgba(255,77,109,0.4)' },
};

export default function SmartToast({ message, type = 'info', visible, onHide }: ToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 60,
          useNativeDriver: true,
          speed: 14,
          bounciness: 6,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(hide, 3200);
      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 200, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const cfg = CONFIG[type];

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }], opacity }]}>
      <View style={[styles.toast, { backgroundColor: cfg.bg, borderColor: cfg.borderColor }]}>
        <View style={[styles.iconBubble, { backgroundColor: `${cfg.color}22` }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
    minWidth: '80%',
    maxWidth: '95%',
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    color: '#F0F6FF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
});
