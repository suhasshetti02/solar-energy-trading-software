import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AnimatedTouchable from '../../src/components/AnimatedTouchable';
import EmptyState from '../../src/components/EmptyState';
import EnergyTransferAnimation from '../../src/components/EnergyTransferAnimation';
import SmartToast from '../../src/components/SmartToast';
import { useAuth } from '../../src/context/AuthContext';
import { useGridState } from '../../src/hooks/useGridState';
import {
  BroadcastRequest,
  EnergyOffer,
  EnergyRequest,
  confirmPaymentAndStartTransfer,
  rejectOffer,
  subscribeActiveBroadcast,
  subscribeIncomingRequests,
  subscribeOffersForRequest,
  subscribeOutgoingRequests
} from '../../src/services/requestService';

import { C } from '../../src/constants/Colors';

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'PENDING', color: '#FFB800', icon: 'time-outline' },
  accepted: { label: 'ACCEPTED', color: '#00D4FF', icon: 'checkmark-circle-outline' },
  transferring: { label: 'TRANSFERRING', color: '#00D4FF', icon: 'flash-outline' },
  completed: { label: 'COMPLETED', color: '#00FF94', icon: 'checkmark-done-outline' },
  rejected: { label: 'REJECTED', color: '#FF4D6D', icon: 'close-circle-outline' },
};

const fmt = (n: number) => `Rs. ${Number(n ?? 0).toFixed(2)}`;

/* ── Animated status dot ── */
const PulseDot = ({ color }: { color: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: anim, marginRight: 6 }} />
  );
};

/* ── Confirm modal ── */
const ConfirmModal = ({
  visible, title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading,
}: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  confirmColor: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <LinearGradient
          colors={[`${confirmColor}22`, 'transparent']}
          style={styles.modalGlow}
        />
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMsg}>{message}</Text>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancel} onPress={onCancel} disabled={loading}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalConfirm, { backgroundColor: confirmColor }]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#0A0F1E" />
              : <Text style={[styles.modalConfirmText, { color: confirmColor === C.red ? '#fff' : '#0A0F1E' }]}>{confirmLabel}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function RequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [incoming, setIncoming] = useState<EnergyRequest[]>([]);
  const [outgoing, setOutgoing] = useState<EnergyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [animatingReq, setAnimatingReq] = useState<EnergyRequest | null>(null);

  const { isHardwareOffline } = useGridState();

  const [userDoc, setUserDoc] = useState<any>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let unsub = () => { };
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      const { db } = require('../../src/services/firebase');
      unsub = onSnapshot(doc(db, "users", user.uid), snap => {
        if (snap.exists()) setUserDoc(snap.data());
      });
    });
    return () => unsub();
  }, [user?.uid]);

  /* toast */
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMsg(msg); setToastType(type); setToastVisible(true);
  };

  /* confirm modal */
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; message: string;
    confirmLabel: string; confirmColor: string; onConfirm: () => Promise<void>;
  }>({ visible: false, title: '', message: '', confirmLabel: '', confirmColor: C.green, onConfirm: async () => { } });
  const [confirming, setConfirming] = useState(false);

  const openConfirm = (opts: typeof confirmModal) => setConfirmModal({ ...opts, visible: true });
  const closeConfirm = () => setConfirmModal(p => ({ ...p, visible: false }));
  const handleConfirm = async () => {
    setConfirming(true);
    try { await confirmModal.onConfirm(); closeConfirm(); }
    catch (e: any) { showToast(e?.message || 'Something went wrong', 'error'); }
    finally { setConfirming(false); }
  };

  /* subscriptions */
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    setLoading(true);
    let pending = 2;
    const done = () => { if (--pending <= 0) setLoading(false); };
    const unsubIn = subscribeIncomingRequests(user.uid, list => { setIncoming(list); done(); }, err => { setError(err.message); done(); });
    const unsubOut = subscribeOutgoingRequests(user.uid, list => { setOutgoing(list); done(); }, err => { setError(err.message); done(); });
    return () => { unsubIn(); unsubOut(); };
  }, [user?.uid]);

  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastRequest | null>(null);
  const [offers, setOffers] = useState<EnergyOffer[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeActiveBroadcast(user.uid, setActiveBroadcast);
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (activeBroadcast?.id) {
      const unsub = subscribeOffersForRequest(activeBroadcast.id, setOffers);
      return () => unsub();
    } else {
      setOffers([]);
    }
  }, [activeBroadcast?.id]);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [activePaymentOffer, setActivePaymentOffer] = useState<EnergyOffer | null>(null);

  const handleConfirmPayment = async () => {
    if (!activeBroadcast || !activePaymentOffer || !user?.uid) return;
    setActingId(activePaymentOffer.id);
    try {
      await confirmPaymentAndStartTransfer(activeBroadcast.id, activePaymentOffer.id, user.uid);
      setPaymentModalVisible(false);
      setActivePaymentOffer(null);
      showToast('Payment successful! Transfer started.', 'success');
      router.push('/(main)/dashboard');
    } catch (err: any) {
      showToast(err?.message || "Failed to confirm payment.", 'error');
    } finally {
      setActingId(null);
    }
  };

  useEffect(() => {
    const t = incoming.find(r => r.status === 'transferring') || outgoing.find(r => r.status === 'transferring');
    if (t && !animatingReq) setAnimatingReq(t);
    else if (!t && animatingReq) setAnimatingReq(null);
  }, [incoming, outgoing]);

  /* actions */
  const onAccept = (r: EnergyRequest) =>
    openConfirm({
      visible: true,
      title: '⚡ Accept Request',
      message: `Confirm accepting ${Number(r.energyKwh ?? 0).toFixed(1)} kWh request?\nBuyer will be notified to pay.`,
      confirmLabel: 'Accept',
      confirmColor: C.green,
      onConfirm: async () => {
        setActingId(r.id);
        const { acceptRequest } = await import('../../src/services/requestService');
        await acceptRequest(r.id);
        setActingId(null);
        showToast('Request accepted! Waiting for payment.', 'success');
      },
    });

  const onReject = (r: EnergyRequest) =>
    openConfirm({
      visible: true,
      title: '✕ Reject Request',
      message: `Are you sure you want to reject this ${Number(r.energyKwh ?? 0).toFixed(1)} kWh request?`,
      confirmLabel: 'Reject',
      confirmColor: C.red,
      onConfirm: async () => {
        setActingId(r.id);
        const { rejectRequest } = await import('../../src/services/requestService');
        await rejectRequest(r.id);
        setActingId(null);
        showToast('Request rejected.', 'info');
      },
    });

  const onPay = async (r: EnergyRequest) => {
    setActingId(r.id);
    try {
      const { startTransfer } = await import('../../src/services/requestService');
      await startTransfer(r.id);
    } catch (e: any) {
      showToast(e?.message || 'Could not start transfer.', 'error');
      setActingId(null);
    }
  };

  const onAcceptOffer = async (offer: EnergyOffer) => {
    if (!activeBroadcast?.id) return;
    setActingId(offer.id);
    try {
      const { acceptOffer } = await import('../../src/services/requestService');
      await acceptOffer(activeBroadcast.id, offer.id);
      setActivePaymentOffer(offer);
      setPaymentModalVisible(true);
    } catch (e: any) {
      showToast(e?.message || 'Failed to accept offer', 'error');
    } finally {
      setActingId(null);
    }
  };

  const onRejectOffer = (offer: EnergyOffer) => {
    openConfirm({
      visible: true,
      title: '✕ Reject Offer',
      message: `Reject offer from ${offer.donorDisplayName}?`,
      confirmLabel: 'Reject',
      confirmColor: C.red,
      onConfirm: async () => {
        setActingId(offer.id);
        await rejectOffer(offer.id);
        setActingId(null);
        showToast('Offer rejected.', 'info');
      }
    });
  };

  const empty = useMemo(
    () => !loading && incoming.length === 0 && outgoing.length === 0,
    [loading, incoming.length, outgoing.length],
  );

  const bestOfferId = useMemo(() => {
    if (offers.length === 0) return null;
    return offers.reduce((best, o) =>
      o.pricePerKwh < best.pricePerKwh ? o : best
    ).id;
  }, [offers]);

  /* ── Request Card ── */
  const RequestCard = ({ r, direction }: { r: EnergyRequest; direction: 'incoming' | 'outgoing' }) => {
    const isIncoming = direction === 'incoming';
    const meta = STATUS_META[r.status] ?? { label: r.status?.toUpperCase() ?? '—', color: C.textSecondary, icon: 'help-outline' };
    const accentColor = isIncoming ? C.cyan : C.amber;
    const cost = Number(r.energyKwh ?? 0) * 10;

    return (
      <View style={[styles.card, { borderLeftColor: accentColor }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.directionBadge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` }]}>
              <Ionicons name={isIncoming ? 'arrow-down' : 'arrow-up'} size={11} color={accentColor} />
              <Text style={[styles.directionText, { color: accentColor }]}>
                {isIncoming ? 'INCOMING' : 'OUTGOING'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(r.status === 'pending' || r.status === 'transferring') && <PulseDot color={meta.color} />}
            <View style={[styles.statusBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}44` }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Ionicons name="flash" size={14} color={C.green} />
            <Text style={styles.metricVal}>{Number(r.energyKwh ?? 0).toFixed(1)} kWh</Text>
            <Text style={styles.metricLbl}>Energy</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Ionicons name="cash-outline" size={14} color={C.cyan} />
            <Text style={[styles.metricVal, { color: C.cyan }]}>{fmt(cost)}</Text>
            <Text style={styles.metricLbl}>Total Cost</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Ionicons name="pricetag-outline" size={14} color={C.amber} />
            <Text style={[styles.metricVal, { color: C.amber }]}>Rs. 10/kWh</Text>
            <Text style={styles.metricLbl}>Rate</Text>
          </View>
        </View>

        {/* Actions */}
        {isIncoming && r.status === 'pending' && (
          <View style={styles.actions}>
            <AnimatedTouchable style={styles.btnReject} disabled={actingId === r.id} onPress={() => onReject(r)}>
              <Ionicons name="close" size={15} color={C.red} />
              <Text style={[styles.btnLabel, { color: C.red }]}>Reject</Text>
            </AnimatedTouchable>
            <AnimatedTouchable style={styles.btnAccept} disabled={actingId === r.id} onPress={() => onAccept(r)}>
              <LinearGradient colors={['#00FF94', '#00C87A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {actingId === r.id
                  ? <ActivityIndicator size="small" color="#0A0F1E" />
                  : <><Ionicons name="checkmark" size={15} color="#0A0F1E" /><Text style={styles.btnAcceptLabel}>Accept</Text></>}
              </LinearGradient>
            </AnimatedTouchable>
          </View>
        )}

        {isIncoming && r.status === 'accepted' && (
          <View style={styles.waitingRow}>
            <PulseDot color={C.cyan} />
            <Text style={styles.waitingText}>Waiting for buyer to complete payment…</Text>
          </View>
        )}

        {!isIncoming && r.status === 'accepted' && (
          <AnimatedTouchable style={styles.payBtn} disabled={actingId === r.id} onPress={() => router.push('/(main)/dashboard')}>
            <LinearGradient colors={['#00D4FF', '#0094CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
              {actingId === r.id
                ? <ActivityIndicator size="small" color="#0A0F1E" />
                : <><Ionicons name="card-outline" size={15} color="#0A0F1E" /><Text style={styles.btnAcceptLabel}>Pay Now</Text></>}
            </LinearGradient>
          </AnimatedTouchable>
        )}

        {r.status === 'transferring' && (
          <View style={[styles.waitingRow, { borderColor: `${C.cyan}33` }]}>
            <PulseDot color={C.cyan} />
            <Text style={[styles.waitingText, { color: C.cyan }]}>⚡ Energy transfer in progress…</Text>
          </View>
        )}

        {r.status === 'completed' && (
          <View style={[styles.waitingRow, { borderColor: `${C.green}33`, backgroundColor: `${C.green}0A` }]}>
            <Ionicons name="checkmark-done" size={14} color={C.green} style={{ marginRight: 6 }} />
            <Text style={[styles.waitingText, { color: C.green }]}>Transfer completed successfully</Text>
          </View>
        )}

        {r.status === 'rejected' && (
          <View style={[styles.waitingRow, { borderColor: `${C.red}33`, backgroundColor: `${C.red}0A` }]}>
            <Ionicons name="close-circle" size={14} color={C.red} style={{ marginRight: 6 }} />
            <Text style={[styles.waitingText, { color: C.red }]}>Request was declined</Text>
          </View>
        )}
      </View>
    );
  };

  const OfferCardComponent = ({ offer }: { offer: EnergyOffer }) => {
    const isPending = offer.status === 'pending';
    const isAccepted = offer.status === 'accepted';
    const isRejected = offer.status === 'rejected';
    const isBest = offer.id === bestOfferId && isPending;
    const totalCost = Number(offer.energyOfferedKwh) * Number(offer.pricePerKwh);
    const accentColor = isAccepted ? C.green : isRejected ? C.red : isBest ? C.green : C.cyan;

    return (
      <View style={[styles.card, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
        <View style={styles.cardHeader}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '800' }}>{offer.donorDisplayName}</Text>
            {isBest && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,255,148,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,255,148,0.3)', alignSelf: 'flex-start' }}>
                <Ionicons name="star" size={10} color={C.green} />
                <Text style={{ color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>RECOMMENDED</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isAccepted ? `${C.green}18` : isRejected ? `${C.red}18` : `${C.amber}18`, borderColor: isAccepted ? `${C.green}44` : isRejected ? `${C.red}44` : `${C.amber}44` }]}>
            <Text style={{ color: isAccepted ? C.green : isRejected ? C.red : C.amber, fontSize: 10, fontWeight: '800' }}>{offer.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Ionicons name="flash" size={14} color={C.green} />
            <Text style={styles.metricVal}>{offer.energyOfferedKwh} kWh</Text>
            <Text style={styles.metricLbl}>Energy</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Ionicons name="pricetag-outline" size={14} color={C.cyan} />
            <Text style={[styles.metricVal, { color: C.cyan }]}>₹{offer.pricePerKwh}/kWh</Text>
            <Text style={styles.metricLbl}>Rate</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Ionicons name="cash-outline" size={14} color={C.amber} />
            <Text style={[styles.metricVal, { color: C.amber }]}>₹{totalCost.toFixed(2)}</Text>
            <Text style={styles.metricLbl}>Total</Text>
          </View>
        </View>
        {isPending && (
          <View style={styles.actions}>
            <AnimatedTouchable style={styles.btnReject} disabled={!!actingId || isHardwareOffline} onPress={() => onRejectOffer(offer)}>
              <Ionicons name="close" size={15} color={isHardwareOffline ? C.textMuted : C.red} />
              <Text style={[styles.btnLabel, { color: isHardwareOffline ? C.textMuted : C.red }]}>Reject</Text>
            </AnimatedTouchable>
            <AnimatedTouchable style={styles.btnAccept} disabled={!!actingId || isHardwareOffline} onPress={() => onAcceptOffer(offer)}>
              <LinearGradient colors={isHardwareOffline ? ['#3D4F63', '#1A2235'] : isBest ? ['#00FF94', '#00C87A'] : ['#00D4FF', '#0094CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {actingId === offer.id ? <ActivityIndicator size="small" color="#0A0F1E" /> : <><Ionicons name={isHardwareOffline ? 'warning' : 'checkmark'} size={15} color="#0A0F1E" /><Text style={styles.btnAcceptLabel}>{isHardwareOffline ? 'Offline' : isBest ? 'Accept Best' : 'Accept'}</Text></>}
              </LinearGradient>
            </AnimatedTouchable>
          </View>
        )}
        {/* The 'Pay Now' button was removed because payment modal is now shown immediately upon clicking Accept */}
      </View>
    );
  };


  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {animatingReq && (
        <EnergyTransferAnimation
          donorName={animatingReq.toHouseId ?? 'Source'}
          receiverName={animatingReq.fromHouseId ?? 'Home'}
          energyKwh={animatingReq.energyKwh}
          status={animatingReq.status}
        />
      )}

      <SmartToast visible={toastVisible} message={toastMsg} type={toastType} onHide={() => setToastVisible(false)} />

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        loading={confirming}
      />

      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,15,30,0.75)' }}>
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(0,212,255,0.25)', paddingTop: 12, paddingBottom: 36, paddingHorizontal: 24 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(139,160,188,0.4)', alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>⚡</Text>
              </View>
              <View>
                <Text style={{ color: '#F0F6FF', fontSize: 18, fontWeight: '900' }}>Confirm Purchase</Text>
                <Text style={{ color: '#8BA0BC', fontSize: 12, marginTop: 2 }}>Review before confirming</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#0A0F1E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(30,58,95,0.7)', padding: 16, marginBottom: 16, gap: 12 }}>
              <View style={styles.row}>
                <Text style={styles.k}>Seller</Text>
                <Text style={styles.v}>{activePaymentOffer?.donorDisplayName}</Text>
              </View>
              <View style={[styles.row, { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.6)' }]}>
                <Text style={styles.k}>Energy</Text>
                <Text style={[styles.v, { color: '#00FF94' }]}>{activePaymentOffer?.energyOfferedKwh} kWh</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.k}>Rate</Text>
                <Text style={styles.v}>₹{activePaymentOffer?.pricePerKwh} / kWh</Text>
              </View>
              <View style={[styles.row, { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(30,58,95,0.6)' }]}>
                <Text style={styles.k}>Wallet Balance</Text>
                <Text style={[styles.v, { color: '#00D4FF' }]}>₹{userDoc?.walletBalance || 0}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(0,212,255,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#8BA0BC', fontSize: 14, fontWeight: '600' }}>Total Cost</Text>
              <Text style={{ color: '#00D4FF', fontSize: 26, fontWeight: '900' }}>₹{((activePaymentOffer?.energyOfferedKwh || 0) * (activePaymentOffer?.pricePerKwh || 0)).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(30,58,95,0.7)', alignItems: 'center' }} onPress={() => { setPaymentModalVisible(false); setActivePaymentOffer(null); }} disabled={!!actingId}>
                <Text style={{ color: '#8BA0BC', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <AnimatedTouchable style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }} onPress={handleConfirmPayment} disabled={!!actingId}>
                <LinearGradient colors={['#00D4FF', '#0094CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
                  {!!actingId ? <ActivityIndicator size="small" color="#0A0F1E" /> : <Text style={{ color: '#0A0F1E', fontWeight: '900', fontSize: 16 }}>Confirm Payment</Text>}
                </LinearGradient>
              </AnimatedTouchable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Requests</Text>
            <Text style={styles.pageSub}>Incoming and outgoing energy requests · live</Text>
          </View>
          <View style={styles.liveChip}>
            <PulseDot color={C.green} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {isHardwareOffline && (
          <View style={{ backgroundColor: 'rgba(255,77,109,0.1)', borderWidth: 1, borderColor: 'rgba(255,77,109,0.3)', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 16 }}>
            <Ionicons name="warning" size={20} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.red, fontWeight: '800', fontSize: 13, marginBottom: 2 }}>Hardware Offline</Text>
              <Text style={{ color: C.textSecondary, fontSize: 11 }}>Requests, offers, and transfers are disabled until the system reconnects.</Text>
            </View>
          </View>
        )}

        {/* Summary strip */}
        {!loading && (incoming.length > 0 || outgoing.length > 0) && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: C.cyan }]}>{incoming.length}</Text>
              <Text style={styles.summaryLabel}>Incoming</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: C.amber }]}>{outgoing.length}</Text>
              <Text style={styles.summaryLabel}>Outgoing</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: C.green }]}>
                {[...incoming, ...outgoing].filter(r => r.status === 'completed').length}
              </Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
          </View>
        )}

        {error ? <Text style={styles.err}>{error}</Text> : null}

        {loading ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.card, { borderLeftColor: i % 2 === 0 ? C.cyan : C.amber, opacity: 1 - i * 0.15 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ width: 90, height: 22, borderRadius: 11, backgroundColor: '#1E2D45' }} />
                  <View style={{ width: 70, height: 22, borderRadius: 11, backgroundColor: '#1E2D45' }} />
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#1A2235', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  {[0, 1, 2].map(j => <View key={j} style={{ flex: 1, height: 36, backgroundColor: '#1E2D45', borderRadius: 8, marginHorizontal: 4 }} />)}
                </View>
              </View>
            ))}
          </View>
        ) : empty ? (
          <EmptyState icon="swap-horizontal-outline" title="No requests yet" message="When a neighbor requests energy or you send a request, it will appear here in real-time." />
        ) : null}

        {activeBroadcast && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 0 }]}>
              <View style={[styles.sectionDot, { backgroundColor: C.cyan }]} />
              <Text style={styles.section}>Incoming Offers</Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Request: {activeBroadcast.energyNeededKwh} kWh at max ₹{activeBroadcast.capPricePerKwh}/kWh
            </Text>

            {offers.length === 0 ? (
              <EmptyState icon="hourglass-outline" title="Awaiting Offers" message="Waiting for neighbors to submit offers..." />
            ) : (
              offers.map(o => <OfferCardComponent key={o.id} offer={o} />)
            )}
          </>
        )}

        {!loading && incoming.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: C.cyan }]} />
              <Text style={styles.section}>Incoming</Text>
            </View>
            {incoming.map(r => <RequestCard key={r.id} r={r} direction="incoming" />)}
          </>
        )}

        {!loading && outgoing.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: C.amber }]} />
              <Text style={styles.section}>Outgoing</Text>
            </View>
            {outgoing.map(r => <RequestCard key={r.id} r={r} direction="outgoing" />)}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  pageSub: { color: C.textSecondary, fontSize: 12, marginTop: 4 },
  liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,255,148,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,255,148,0.25)', marginTop: 6 },
  liveText: { color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  summaryStrip: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryCount: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: C.border },

  err: { color: C.red, marginTop: 8, fontSize: 13, marginBottom: 12 },
  loading: { paddingVertical: 64, alignItems: 'center', gap: 14 },
  loadingText: { color: C.textSecondary, fontSize: 13 },

  empty: { marginTop: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, borderRadius: 20 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyBody: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  section: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  /* Card */
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  directionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  directionText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  metricsRow: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 14, padding: 14, marginBottom: 16 },
  metricBox: { flex: 1, alignItems: 'center', gap: 4 },
  metricVal: { color: C.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
  metricLbl: { color: C.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 },
  metricDivider: { width: 1, backgroundColor: C.border },

  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: 'rgba(255,77,109,0.4)', backgroundColor: 'rgba(255,77,109,0.08)', width: 100 },
  btnAccept: { flex: 2, borderRadius: 12, overflow: 'hidden', width: 140 },
  payBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  btnLabel: { fontSize: 13, fontWeight: '700' },
  btnAcceptLabel: { color: '#0A0F1E', fontSize: 14, fontWeight: '800' },

  waitingRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', marginTop: 4 },
  waitingText: { color: C.textSecondary, fontSize: 12, fontStyle: 'italic', flex: 1 },

  /* Confirm Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(10,15,30,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: C.surface, borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  modalGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  modalTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  modalMsg: { color: C.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  modalConfirm: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontWeight: '800', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  k: { color: C.textSecondary, fontSize: 14 },
  v: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
});
