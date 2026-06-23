import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGridState } from '../../src/hooks/useGridState';
import { subscribeHardwareEvents } from '../../src/services/hardwareService';

import { C } from '../../src/constants/Colors';

export default function SystemScreen() {
  const router = useRouter();
  const { gridState, isHardwareOffline } = useGridState();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeHardwareEvents(setEvents, 100);
    return () => unsub();
  }, []);

  const getEventIcon = (type: string) => {
    if (type.includes('Fault') || type.includes('Lost')) return { name: 'warning', color: C.red };
    if (type.includes('Completed') || type.includes('Started')) return { name: 'flash', color: C.cyan };
    if (type.includes('Switch') || type.includes('Contactor')) return { name: 'git-network', color: C.green };
    return { name: 'information-circle', color: C.textSecondary };
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>System Activity</Text>
          <Text style={styles.sub}>Diagnostic & Monitoring Logs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Hardware Status Panel */}
        <LinearGradient
          colors={isHardwareOffline ? ['rgba(255,77,109,0.15)', 'rgba(255,77,109,0.05)'] : ['rgba(0,255,148,0.15)', 'rgba(0,255,148,0.05)']}
          style={styles.statusPanel}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="hardware-chip" size={24} color={isHardwareOffline ? C.red : C.green} />
            <Text style={[styles.statusText, { color: isHardwareOffline ? C.red : C.green }]}>
              {isHardwareOffline ? 'HARDWARE OFFLINE' : 'SYSTEM ONLINE'}
            </Text>
          </View>
          
          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Heartbeat</Text>
              <Text style={styles.gridVal}>{gridState?.esp32_heartbeat?.toDate ? new Date(gridState.esp32_heartbeat.toDate()).toLocaleTimeString() : '---'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Mode</Text>
              <Text style={styles.gridVal}>{gridState?.availability_mode || 'GRID'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Source</Text>
              <Text style={styles.gridVal}>{gridState?.bus_source || 'GRID'}</Text>
            </View>
          </View>

          <View style={styles.contactors}>
            <Text style={styles.contactorsTitle}>PLC CONTACTORS</Text>
            <View style={styles.contactorRow}>
              <Text style={styles.contactorLabel}>C1: Grid Connect</Text>
              <Ionicons name={gridState?.contactor_1 ? 'checkmark-circle' : 'close-circle'} size={18} color={gridState?.contactor_1 ? C.green : C.textMuted} />
            </View>
            <View style={styles.contactorRow}>
              <Text style={styles.contactorLabel}>C2: Battery Connect</Text>
              <Ionicons name={gridState?.contactor_2 ? 'checkmark-circle' : 'close-circle'} size={18} color={gridState?.contactor_2 ? C.green : C.textMuted} />
            </View>
            <View style={styles.contactorRow}>
              <Text style={styles.contactorLabel}>C3: Load Shed</Text>
              <Ionicons name={gridState?.contactor_3 ? 'checkmark-circle' : 'close-circle'} size={18} color={gridState?.contactor_3 ? C.red : C.textMuted} />
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Hardware Events</Text>
        
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={32} color={C.textMuted} />
            <Text style={styles.emptyText}>No events logged yet.</Text>
          </View>
        ) : (
          events.map((ev) => {
            const icon = getEventIcon(ev.eventType);
            return (
              <View key={ev.id} style={styles.eventCard}>
                <View style={[styles.eventIcon, { backgroundColor: `${icon.color}15`, borderColor: `${icon.color}40` }]}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                </View>
                <View style={styles.eventBody}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={[styles.eventType, { color: icon.color }]}>{ev.eventType}</Text>
                    <Text style={styles.eventTime}>{ev.createdAt?.toDate ? new Date(ev.createdAt.toDate()).toLocaleTimeString() : ''}</Text>
                  </View>
                  <Text style={styles.eventDetails}>{ev.details}</Text>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { marginRight: 16, padding: 4 },
  title: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 100 },
  statusPanel: { borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,255,148,0.3)' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  statusText: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gridVal: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  contactors: { backgroundColor: 'rgba(10,15,30,0.4)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  contactorsTitle: { fontSize: 10, color: C.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  contactorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contactorLabel: { fontSize: 13, color: C.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  eventCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  eventIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  eventBody: { flex: 1, justifyContent: 'center' },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventType: { fontSize: 13, fontWeight: '800' },
  eventTime: { fontSize: 11, color: C.textMuted },
  eventDetails: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.textMuted, marginTop: 12, fontSize: 14 },
});
