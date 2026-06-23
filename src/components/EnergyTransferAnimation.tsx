import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";
import { C } from "../constants/Colors";

const { width } = Dimensions.get("window");
const TRACK_WIDTH = width * 0.55;

// One animated particle
function Particle({ index, total }: { index: number; total: number }) {
  const progress = useRef(new Animated.Value(index / total)).current;

  useEffect(() => {
    // Each particle starts at its offset, then loops
    const offset = index / total;
    progress.setValue(offset);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: offset + 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [index / total, index / total + 1],
    outputRange: [-TRACK_WIDTH / 2, TRACK_WIDTH / 2],
  });

  const opacity = progress.interpolate({
    inputRange: [
      index / total,
      index / total + 0.1,
      index / total + 0.85,
      index / total + 1,
    ],
    outputRange: [0, 1, 1, 0],
  });

  const scale = progress.interpolate({
    inputRange: [
      index / total,
      index / total + 0.5,
      index / total + 1,
    ],
    outputRange: [0.5, 1.2, 0.5],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { transform: [{ translateX }, { scale }], opacity },
      ]}
    />
  );
}

// Pulsing node
function Node({
  icon,
  label,
  color,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  delay?: number;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const innerPulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    );
    const ringAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    innerPulse.start();
    ringAnim.start();
    return () => { innerPulse.stop(); ringAnim.stop(); };
  }, []);

  return (
    <View style={styles.nodeWrapper}>
      {/* Ring ripple */}
      <Animated.View
        style={[
          styles.nodeRing,
          {
            borderColor: color,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      {/* Glow */}
      <Animated.View
        style={[
          styles.nodeGlow,
          { backgroundColor: `${color}30`, transform: [{ scale: pulse }] },
        ]}
      />
      {/* Core */}
      <Animated.View
        style={[
          styles.nodeCore,
          { borderColor: color, transform: [{ scale: pulse }] },
        ]}
      >
        <Ionicons name={icon} size={22} color={color} />
      </Animated.View>
      <Text style={[styles.nodeLabel, { color }]}>{label}</Text>
    </View>
  );
}

interface EnergyTransferAnimationProps {
  donorName?: string;
  receiverName?: string;
  energyKwh?: number;
  estimatedCost?: number;
  status?: string;
}

export default function EnergyTransferAnimation({
  donorName = "Source",
  receiverName = "Home",
  energyKwh,
  estimatedCost,
  status = "transferring",
}: EnergyTransferAnimationProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 4 }),
    ]).start();
  }, []);

  const PARTICLE_COUNT = 5;

  return (
    <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      {/* Gradient top accent */}
      <LinearGradient
        colors={["rgba(0,212,255,0.18)", "transparent"]}
        style={styles.cardTopGlow}
      />

      {/* Live badge */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE TRANSFER</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>⚡ Energy Transfer Active</Text>
      <Text style={styles.subtitle}>
        Power flowing through the neighborhood bus
      </Text>

      {/* Flow diagram */}
      <View style={styles.flowRow}>
        <Node icon="flash" label={donorName} color={C.brandPrimary} delay={0} />

        {/* Animated track */}
        <View style={styles.trackContainer}>
          {/* Track glow */}
          <LinearGradient
            colors={[`${C.brandPrimary}00`, `${C.energySurplus}66`, `${C.brandPrimary}00`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.trackGlow}
          />
          {/* Track line */}
          <View style={styles.trackLine} />
          {/* Particles */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={i} index={i} total={PARTICLE_COUNT} />
          ))}
        </View>

        <Node icon="home" label={receiverName} color={C.energySurplus} delay={300} />
      </View>

      {/* Stats row */}
      {(energyKwh != null || estimatedCost != null) && (
        <View style={styles.statsRow}>
          {energyKwh != null && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Number(energyKwh).toFixed(1)} kWh</Text>
              <Text style={styles.statLabel}>Energy</Text>
            </View>
          )}
          {energyKwh != null && estimatedCost != null && (
            <View style={styles.statDivider} />
          )}
          {estimatedCost != null && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: C.brandPrimary }]}>
                ₹{Number(estimatedCost).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Est. Cost</Text>
            </View>
          )}
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.warning, fontSize: 12 }]}>
              {status === "hardware_confirmed" ? "⚙ Finalizing" : "⚡ In Progress"}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      )}

      {status === "hardware_confirmed" && (
        <View style={styles.confirmedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={C.energySurplus} />
          <Text style={styles.confirmedText}>Hardware Confirmed · Finalizing Settlement</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${C.brandPrimary}55`,
    padding: 28,
    alignItems: "center",
    shadowColor: C.brandPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 14,
    overflow: "hidden",
    marginBottom: 24,
  },
  cardTopGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderRadius: 24,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,255,148,0.1)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,255,148,0.3)",
    marginBottom: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF94",
  },
  liveText: {
    color: "#00FF94",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F0F6FF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,212,255,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: "#8BA0BC",
    fontSize: 13,
    marginBottom: 32,
    textAlign: "center",
  },

  /* Flow */
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 28,
  },
  trackContainer: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    overflow: "visible",
  },
  trackGlow: {
    position: "absolute",
    width: "100%",
    height: 10,
    borderRadius: 5,
  },
  trackLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 1,
  },
  particle: {
    position: "absolute",
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FF94",
    shadowColor: "#00FF94",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  /* Nodes */
  nodeWrapper: { alignItems: "center", width: 64 },
  nodeRing: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
  },
  nodeGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  nodeCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0A0F1E",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "rgba(10,15,30,0.6)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(30,58,95,0.6)",
    padding: 14,
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(30,58,95,0.8)" },
  statValue: { color: "#F0F6FF", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  statLabel: { color: "#8BA0BC", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 },

  confirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,255,148,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,255,148,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
  },
  confirmedText: {
    color: "#00FF94",
    fontSize: 12,
    fontWeight: "700",
  },
});
