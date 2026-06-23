import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/Colors';
import { useGridState } from '../hooks/useGridState';

export default function SystemHealthCard() {
  const { gridState, isHardwareOffline } = useGridState();

  const isOnline = !isHardwareOffline;
  const statusColor = isOnline ? C.green : C.red;
  
  // Calculate relative time if heartbeat exists
  const getRelativeTime = () => {
    if (!gridState?.esp32_heartbeat) return 'Unknown';
    const hbMillis = gridState.esp32_heartbeat.toMillis ? gridState.esp32_heartbeat.toMillis() : 0;
    if (!hbMillis) return 'Unknown';
    
    const diffSeconds = Math.floor((Date.now() - hbMillis) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return 'Offline';
  };

  const syncText = getRelativeTime();
  const mode = gridState?.bus_source || 'GRID';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="hardware-chip-outline" size={18} color={C.brandPrimary} />
          <Text style={styles.title}>System Health</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? `${C.green}18` : `${C.red}18`, borderColor: isOnline ? `${C.green}44` : `${C.red}44` }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>ESP32 Microcontroller</Text>
          <Text style={[styles.cellValue, { color: statusColor }]}>{isOnline ? 'Connected' : 'Disconnected'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>PLC Node</Text>
          <Text style={[styles.cellValue, { color: statusColor }]}>{isOnline ? 'Active' : 'Unreachable'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Current Mode</Text>
          <Text style={styles.cellValue}>{mode}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Last Sync</Text>
          <Text style={styles.cellValue}>{syncText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cell: {
    width: '46%',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: -6,
  },
  cellLabel: {
    color: C.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cellValue: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
