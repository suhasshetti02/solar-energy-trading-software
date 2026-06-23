import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ChipVariant = 'SURPLUS' | 'DEFICIT' | 'LOW_BATTERY' | 'OFFLINE' | 'BALANCED' | 'LIVE' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';

interface StatusChipProps {
  variant: ChipVariant;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

import { C } from '../constants/Colors';

const CHIP_CONFIG: Record<ChipVariant, { color: string; bg: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
  SURPLUS:     { color: C.green, bg: 'rgba(0,255,148,0.12)',   border: 'rgba(0,255,148,0.35)',   icon: 'trending-up-outline' },
  DEFICIT:     { color: C.red,   bg: 'rgba(255,77,109,0.12)',  border: 'rgba(255,77,109,0.35)',  icon: 'trending-down-outline' },
  LOW_BATTERY: { color: C.amber, bg: 'rgba(255,184,0,0.12)',   border: 'rgba(255,184,0,0.35)',   icon: 'battery-dead-outline' },
  OFFLINE:     { color: C.textSecondary, bg: 'rgba(139,160,188,0.12)', border: 'rgba(139,160,188,0.35)', icon: 'cloud-offline-outline' },
  BALANCED:    { color: C.brandPrimary, bg: 'rgba(76,201,240,0.12)',  border: 'rgba(76,201,240,0.35)',  icon: 'checkmark-circle-outline' },
  LIVE:        { color: C.energySurplus, bg: 'rgba(0,255,148,0.1)',    border: 'rgba(0,255,148,0.3)',    icon: 'radio-outline' },
  PENDING:     { color: C.warning, bg: 'rgba(255,184,0,0.12)',   border: 'rgba(255,184,0,0.35)',   icon: 'time-outline' },
  ACTIVE:      { color: C.brandPrimary, bg: 'rgba(0,212,255,0.12)',   border: 'rgba(0,212,255,0.35)',   icon: 'flash-outline' },
  COMPLETED:   { color: C.energySurplus, bg: 'rgba(0,255,148,0.12)',   border: 'rgba(0,255,148,0.35)',   icon: 'checkmark-done-outline' },
  REJECTED:    { color: C.energyDeficit, bg: 'rgba(255,77,109,0.12)',  border: 'rgba(255,77,109,0.35)',  icon: 'close-circle-outline' },
};

const LABEL_MAP: Record<ChipVariant, string> = {
  SURPLUS: 'Surplus', DEFICIT: 'Deficit', LOW_BATTERY: 'Low Battery',
  OFFLINE: 'Offline', BALANCED: 'Balanced', LIVE: 'Live',
  PENDING: 'Pending', ACTIVE: 'Active', COMPLETED: 'Completed', REJECTED: 'Rejected',
};

export default function StatusChip({ variant, label, pulse = false, size = 'md' }: StatusChipProps) {
  const cfg = CHIP_CONFIG[variant];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const isSm = size === 'sm';

  return (
    <View style={[
      styles.chip,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      isSm && styles.chipSm,
    ]}>
      {pulse ? (
        <Animated.View style={[styles.dot, { backgroundColor: cfg.color, opacity: pulseAnim }]} />
      ) : (
        <Ionicons name={cfg.icon} size={isSm ? 10 : 12} color={cfg.color} />
      )}
      <Text style={[styles.label, { color: cfg.color }, isSm && styles.labelSm]}>
        {label ?? LABEL_MAP[variant]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelSm: {
    fontSize: 9,
  },
});
