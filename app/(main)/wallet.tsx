import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { subscribeUserTransactions } from '../../src/services/energyService';

import { C } from '../../src/constants/Colors';
import EmptyState from '../../src/components/EmptyState';

export const getDisplayName = (id: string, fallbackName?: string): string => {
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

export default function WalletScreen() {
  const { user, userDoc } = useAuth() as any;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserTransactions(user.uid, (txns: any[]) => {
      // Accept both casing variants: new writes use lowercase, old docs may use uppercase
      setTransactions(txns.filter((t: any) =>
        t.status === 'completed' || t.status === 'COMPLETED'
      ));
      setLoading(false);
    }, (err: any) => {
      setWalletError(err?.message || 'Unable to read Firestore data');
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // donorUserId = seller, receiverUserId = buyer
  const earned = transactions.filter((t) => t.donorUserId === user?.uid).reduce((s, t) => s + (t.totalCost ?? 0), 0);
  const spent  = transactions.filter((t) => t.receiverUserId === user?.uid).reduce((s, t) => s + (t.totalCost ?? 0), 0);
  const balance = earned - spent;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Wallet</Text>
        <Text style={styles.pageSub}>Your energy trading balance</Text>

        {/* Glowing balance card */}
        <LinearGradient
          colors={['rgba(0,212,255,0.20)', 'rgba(0,212,255,0.04)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>₹ {Number(balance ?? 0).toFixed(2)}</Text>

          <View style={[styles.statsRow, { marginTop: 24 }]}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>+₹{earned.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.red }]}>-₹{spent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Trades</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, marginTop: 16 }}>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="add-circle-outline" size={20} color={C.green} />
            <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: '700' }}>Add Funds</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={C.cyan} />
            <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: '700' }}>Withdraw</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {loading ? (
          <ActivityIndicator color={C.cyan} style={{ marginTop: 32 }} />
        ) : walletError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Unable to load transactions"
            message="Check your internet connection and try again."
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="No Transactions Yet"
            message="Completed energy trades will appear here as balance updates."
          />
        ) : (
          transactions.slice(0, 10).map((t: any) => {
            // donorUserId = the energy seller; receiverUserId = the buyer
            const isSeller = t.donorUserId === user?.uid;
            const counterparty = isSeller
              ? getDisplayName(t.receiverUserId ?? '', t.receiver_display_name)
              : getDisplayName(t.donorUserId ?? '', t.donor_display_name);
            return (
              <View key={t.id} style={styles.txnRow}>
                <View style={[styles.txnIconWrap, { backgroundColor: isSeller ? C.greenDim : C.redDim }]}>
                  <Text style={styles.txnIcon}>{isSeller ? '⬆' : '⬇'}</Text>
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnTitle}>
                    {isSeller ? `Sold to ${counterparty}` : `Bought from ${counterparty}`}
                  </Text>
                  <Text style={styles.txnUnits}>{t.energyKwh ?? t.energy ?? 0} kWh</Text>
                </View>
                <Text style={[styles.txnAmount, { color: isSeller ? C.green : C.red }]}>
                  {isSeller ? '+' : '-'}₹{(t.totalCost ?? t.amount ?? 0).toFixed(2)}
                </Text>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 56 },
  pageTitle: { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  pageSub: { color: C.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  balanceCard: {
    borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.cyanBorder, marginBottom: 24,
  },
  balanceLabel: { color: C.cyan, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  balanceValue: { color: C.textPrimary, fontSize: 40, fontWeight: '800', marginTop: 8, letterSpacing: -1 },
  balanceHouseId: { color: C.textMuted, fontSize: 12, marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: C.green, fontSize: 18, fontWeight: '800' },
  statLabel: { color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(30,58,95,0.8)' },
  sectionTitle: {
    color: C.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 16 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  emptySub: { color: C.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  txnRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  txnIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txnIcon: { fontSize: 18 },
  txnInfo: { flex: 1 },
  txnTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  txnUnits: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '800' },
});