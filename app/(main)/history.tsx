import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeUserTransactions } from '../../src/services/energyService';
import CustomButton from '../../src/components/CustomButton';

import { C } from '../../src/constants/Colors';
import EmptyState from '../../src/components/EmptyState';

const formatDate = (timestamp: any) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (amount: number) => `₹${Number(amount ?? 0).toFixed(2)}`;

const getDisplayName = (id: string, fallbackName?: string): string => {
  if (fallbackName && fallbackName.trim() !== '') return fallbackName;
  const map: Record<string, string> = {
    house_h1: 'House A',
    house_h2: 'House B',
    house_h3: 'House C',
  };
  const mapped = map[id] ?? id ?? 'Neighbor';
  if (mapped.length > 20 && !mapped.includes('House')) {
    return 'Neighbor';
  }
  return mapped;
};

const BillCard = ({ transaction, userId }: { transaction: any; userId: string }) => {
  const donorId = transaction.donor_id || transaction.donorUserId;
  const receiverId = transaction.receiver_id || transaction.receiverUserId;
  const isSeller = donorId === userId;
  const role = isSeller ? 'Sold' : 'Bought';
  const accentColor = isSeller ? C.green : C.cyan;
  
  let counterparty = '';
  if (isSeller) {
    counterparty = getDisplayName(receiverId ?? '', transaction.receiver_display_name);
  } else {
    counterparty = getDisplayName(donorId ?? '', transaction.donor_display_name);
  }

  const amountSign = isSeller ? '+' : '-';

  const rate = (transaction.totalCost ?? 0) / Math.max(transaction.energyKwh ?? transaction.energy ?? 1, 0.01);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.rolePill, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
              <Text style={{ fontSize: 14 }}>{isSeller ? '📤' : '📥'}</Text>
              <Text style={[styles.roleText, { color: accentColor }]}>{role}</Text>
            </View>
          </View>
          <Text style={[styles.amountText, { color: accentColor }]}>
            {amountSign}{formatMoney(transaction.totalCost ?? transaction.amount)}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Energy</Text>
            <Text style={styles.metricValue}>{transaction.energyKwh ?? transaction.energy ?? 0} kWh</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{isSeller ? 'Buyer' : 'Seller'}</Text>
            <Text style={styles.metricValue}>{counterparty}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Rate</Text>
            <Text style={[styles.metricValue, { color: accentColor }]}>₹{rate.toFixed(1)}/kWh</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.dateText}>🕐 {formatDate(transaction.createdAt)}</Text>
          <View style={{ backgroundColor: 'rgba(0,255,148,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,255,148,0.25)' }}>
            <Text style={{ color: '#00FF94', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>COMPLETED</Text>
          </View>
        </View>
      </View>
    </View>
  );
};


export default function HistoryScreen() {
  const router = useRouter();
  const { user, offline } = useAuth() as any;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserTransactions(user.uid, (txns: any[]) => {
      // Accept both casing variants: new writes use lowercase 'completed'
      setTransactions(txns.filter((tx: any) =>
        tx.status === 'completed' || tx.status === 'COMPLETED'
      ));
      setLoading(false);
    }, (err: any) => {
      setHistoryError(err?.message || 'Unable to read Firestore data');
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const totalVolume = transactions.reduce((s, t) => s + (t.energyKwh ?? t.energy ?? 0), 0);
  const totalValue = transactions.reduce((s, t) => s + (t.totalCost ?? 0), 0);
  const totalSold = transactions.filter((t) => (t.donor_id || t.donorUserId) === user?.uid).length;
  const totalBought = transactions.filter((t) => (t.receiver_id || t.receiverUserId) === user?.uid).length;

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.scroll, { paddingTop: 56 }]}>
          <View style={styles.header}>
            <View style={{ width: 180, height: 28, borderRadius: 8, backgroundColor: '#1E2D45', marginBottom: 8 }} />
            <View style={{ width: 140, height: 13, borderRadius: 6, backgroundColor: '#1E2D45' }} />
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(30,58,95,0.6)' }}>
            {[0,1,2].map(i => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 60, height: 18, borderRadius: 6, backgroundColor: '#1E2D45', marginBottom: 8 }} />
                <View style={{ width: 40, height: 10, borderRadius: 5, backgroundColor: '#1E2D45' }} />
              </View>
            ))}
          </View>
          {[0,1,2,3].map(i => (
            <View key={i} style={[styles.card, { opacity: 1 - i * 0.2, marginBottom: 12 }]}>
              <View style={{ width: 4, backgroundColor: i % 2 === 0 ? '#1E3A2E' : '#1A2E3A' }} />
              <View style={{ flex: 1, padding: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ width: 70, height: 22, borderRadius: 8, backgroundColor: '#1E2D45' }} />
                  <View style={{ width: 80, height: 20, borderRadius: 6, backgroundColor: '#1E2D45' }} />
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#1A2235', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <View style={{ flex: 1, height: 30, backgroundColor: '#1E2D45', borderRadius: 6, marginRight: 8 }} />
                  <View style={{ flex: 1, height: 30, backgroundColor: '#1E2D45', borderRadius: 6 }} />
                </View>
                <View style={{ width: 120, height: 11, borderRadius: 5, backgroundColor: '#1E2D45' }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Transaction History</Text>
              <Text style={styles.pageSub}>Your energy trading record</Text>
            </View>

            {offline && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineEmoji}>📡</Text>
                <View>
                  <Text style={styles.offlineTitle}>You are Offline</Text>
                  <Text style={styles.offlineSub}>Showing cached transaction history.</Text>
                </View>
              </View>
            )}

            {transactions.length > 0 && (
              <>
                <View style={styles.statsCard}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{transactions.length}</Text>
                    <Text style={styles.statLabel}>Trades</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalVolume.toFixed(1)} kWh</Text>
                    <Text style={styles.statLabel}>Volume</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>₹{totalValue.toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Value</Text>
                  </View>
                </View>

                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownChip, { backgroundColor: C.greenDim, borderColor: C.greenBorder }]}>
                    <Text style={styles.breakdownEmoji}>📤</Text>
                    <Text style={[styles.breakdownValue, { color: C.green }]}>{totalSold}</Text>
                    <Text style={styles.breakdownLabel}>Sold</Text>
                  </View>
                  <View style={[styles.breakdownChip, { backgroundColor: C.cyanDim, borderColor: C.cyanBorder }]}>
                    <Text style={styles.breakdownEmoji}>📥</Text>
                    <Text style={[styles.breakdownValue, { color: C.cyan }]}>{totalBought}</Text>
                    <Text style={styles.breakdownLabel}>Bought</Text>
                  </View>
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>BILLS & RECEIPTS</Text>
          </>
        }
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BillCard transaction={item} userId={user?.uid} />}
        ListEmptyComponent={historyError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="History unavailable"
            message="Connect to the internet to load your trading history."
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title="No Trade History"
            message="Every completed energy transfer generates a receipt here."
          />
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.textSecondary, marginTop: 16, fontSize: 14 },
  scroll: { padding: 20, paddingTop: 56 },
  header: { marginBottom: 24 },
  pageTitle: { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  pageSub: { color: C.textSecondary, fontSize: 13, marginTop: 4 },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.amberDim,
    borderColor: C.amberBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  offlineEmoji: { fontSize: 22 },
  offlineTitle: { color: C.amber, fontWeight: '700', fontSize: 13 },
  offlineSub: { color: C.textSecondary, fontSize: 11, marginTop: 2 },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: C.textPrimary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: C.textSecondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },

  breakdownRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  breakdownChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    gap: 8,
  },
  breakdownEmoji: { fontSize: 18 },
  breakdownValue: { fontSize: 22, fontWeight: '800' },
  breakdownLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },

  sectionLabel: { color: C.textMuted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14, fontWeight: '700' },

  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rolePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  amountText: { fontSize: 20, fontWeight: '800' },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: { color: C.textSecondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  metricValue: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  metricDivider: { width: 1, height: 30, backgroundColor: C.border },
  dateText: { color: C.textSecondary, fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 22 },
});
