import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

const C = { bg: '#0A0F1E', surface: '#111827', border: 'rgba(30,58,95,0.65)' };

export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SkeletonLoader width={60} height={10} borderRadius={5} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={160} height={28} borderRadius={8} style={{ marginBottom: 6 }} />
          <SkeletonLoader width={80} height={10} borderRadius={5} />
        </View>
        <SkeletonLoader width={70} height={32} borderRadius={10} />
      </View>

      {/* Mode Banner */}
      <SkeletonLoader height={52} borderRadius={14} style={{ marginBottom: 14 }} />

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <SkeletonLoader width={90} height={11} borderRadius={5} />
          <SkeletonLoader width={70} height={22} borderRadius={11} />
        </View>
        <SkeletonLoader width={200} height={28} borderRadius={8} style={{ marginTop: 14, marginBottom: 8 }} />
        <SkeletonLoader width={280} height={13} borderRadius={6} style={{ marginBottom: 4 }} />
        <SkeletonLoader width={220} height={13} borderRadius={6} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <SkeletonLoader width={60} height={12} borderRadius={5} />
          <SkeletonLoader width={40} height={24} borderRadius={6} />
        </View>
        <SkeletonLoader height={8} borderRadius={4} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonLoader width={50} height={12} borderRadius={5} />
          <SkeletonLoader width={80} height={14} borderRadius={6} />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.metricCard}>
            <SkeletonLoader width={20} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={60} height={17} borderRadius={6} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={40} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Power Flow Card */}
      <View style={styles.sectionCard}>
        <SkeletonLoader width={100} height={12} borderRadius={5} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <SkeletonLoader width={50} height={50} borderRadius={25} />
          <SkeletonLoader width={40} height={12} borderRadius={5} />
          <SkeletonLoader width={50} height={50} borderRadius={25} />
        </View>
      </View>

      {/* Action Card */}
      <View style={styles.sectionCard}>
        <SkeletonLoader width={60} height={12} borderRadius={5} style={{ marginBottom: 12 }} />
        <SkeletonLoader height={52} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 52 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerLeft: {},
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: 'flex-start',
  },
  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
});
