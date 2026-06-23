import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  border: 'rgba(30,58,95,0.65)',
  cyan: '#00D4FF',
  green: '#00FF94',
  red: '#FF4D6D',
  amber: '#FFB800',
  textPrimary: '#F0F6FF',
  textSecondary: '#8BA0BC',
  textMuted: '#3D4F63',
};

interface PowerFlowProps {
  busSource?: string; // 'GRID' | 'BATTERY' | 'P2P' | 'DUMP_LOAD'
  switchingConfirmed?: boolean;
}

interface FlowNode {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface FlowConnection {
  from: string;
  to: string;
}

const NODE_CONFIGS: Record<string, FlowNode> = {
  GRID:      { id: 'GRID',      label: 'Grid',       icon: 'business-outline',  color: C.amber },
  BATTERY:   { id: 'BATTERY',   label: 'Battery',    icon: 'battery-charging-outline', color: C.green },
  P2P:       { id: 'P2P',       label: 'P2P Bus',    icon: 'people-outline',    color: C.cyan  },
  HOME:      { id: 'HOME',      label: 'Home',       icon: 'home-outline',      color: '#A0C4FF' },
  DUMP_LOAD: { id: 'DUMP_LOAD', label: 'Dump Load',  icon: 'warning-outline',   color: C.red   },
};

function getActiveFlow(busSource: string): { nodes: FlowNode[]; connections: FlowConnection[] } {
  switch (busSource) {
    case 'P2P':
    case 'BATTERY':
      return {
        nodes: [NODE_CONFIGS.BATTERY, NODE_CONFIGS.P2P, NODE_CONFIGS.HOME],
        connections: [{ from: 'BATTERY', to: 'P2P' }, { from: 'P2P', to: 'HOME' }],
      };
    case 'DUMP_LOAD':
      return {
        nodes: [NODE_CONFIGS.BATTERY, NODE_CONFIGS.DUMP_LOAD],
        connections: [{ from: 'BATTERY', to: 'DUMP_LOAD' }],
      };
    case 'GRID':
    default:
      return {
        nodes: [NODE_CONFIGS.GRID, NODE_CONFIGS.HOME],
        connections: [{ from: 'GRID', to: 'HOME' }],
      };
  }
}

function FlowNodeCard({ node, isActive }: { node: FlowNode; isActive: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  return (
    <View style={styles.nodeWrapper}>
      <Animated.View style={[styles.nodeGlow, { backgroundColor: `${node.color}20`, transform: [{ scale: pulse }] }]} />
      <View style={[styles.nodeBox, { borderColor: isActive ? node.color : C.border }]}>
        <Ionicons name={node.icon} size={22} color={node.color} />
      </View>
      <Text style={[styles.nodeLabel, { color: isActive ? node.color : C.textMuted }]}>{node.label}</Text>
    </View>
  );
}

function FlowArrow({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });

  return (
    <View style={styles.arrowWrapper}>
      <Animated.View style={{ opacity }}>
        <Ionicons name="arrow-forward" size={20} color={color} />
      </Animated.View>
    </View>
  );
}

export default function PowerFlowWidget({ busSource = 'GRID', switchingConfirmed }: PowerFlowProps) {
  const { nodes, connections } = getActiveFlow(busSource);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titleDot} />
        <Text style={styles.title}>Power Flow</Text>
        {switchingConfirmed && (
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedText}>HW Confirmed</Text>
          </View>
        )}
      </View>

      <View style={styles.flowRow}>
        {nodes.map((node, idx) => (
          <React.Fragment key={node.id}>
            <FlowNodeCard node={node} isActive />
            {idx < nodes.length - 1 && <FlowArrow color={nodes[idx].color} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cyan,
  },
  title: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  confirmedBadge: {
    backgroundColor: 'rgba(0,255,148,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,255,148,0.4)',
  },
  confirmedText: {
    color: '#00FF94',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  nodeGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nodeBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A0F1E',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrowWrapper: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
});
