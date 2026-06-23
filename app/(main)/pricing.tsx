import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SmartToast from '../../src/components/SmartToast';
import { useAuth } from '../../src/context/AuthContext';
import { useEnergy } from '../../src/context/EnergyContext';
import CustomButton from '../../src/components/CustomButton';
import {
  BASE_RATE_PER_KWH,
  PREMIUM_THRESHOLD_KWH,
} from '../../src/constants/market';

import { C } from '../../src/constants/Colors';

const formatMoney = (amount: number) => `₹${Number(amount ?? 0).toFixed(2)}`;
const SAVE_TIMEOUT_MS = 10000;
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Saving preferences is taking too long. Please try again.')), timeoutMs)
    ),
  ]);

/* ── Animated pulse dot ── */
const PulseDot = ({ color }: { color: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: anim }} />;
};

/* ── Confirm Save Modal ── */
const ConfirmSaveModal = ({
  visible, donorEnabled, reserveBattery, maxShareable, extraRate,
  onConfirm, onCancel, loading,
}: {
  visible: boolean; donorEnabled: boolean; reserveBattery: number;
  maxShareable: number; extraRate: string; onConfirm: () => void;
  onCancel: () => void; loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <LinearGradient colors={['rgba(0,212,255,0.15)', 'transparent']} style={styles.modalGlow} />

        {/* Icon */}
        <View style={styles.modalIconWrap}>
          <LinearGradient colors={['#00D4FF', '#0094CC']} style={styles.modalIcon}>
            <Ionicons name="settings-outline" size={22} color="#0A0F1E" />
          </LinearGradient>
        </View>

        <Text style={styles.modalTitle}>Confirm Preferences</Text>
        <Text style={styles.modalSub}>Review your energy sharing settings before saving.</Text>

        {/* Summary rows */}
        <View style={styles.modalSummary}>
          <View style={styles.modalRow}>
            <Text style={styles.modalKey}>Energy Sharing</Text>
            <View style={[styles.chip, { backgroundColor: donorEnabled ? 'rgba(0,255,148,0.12)' : 'rgba(255,77,109,0.12)', borderColor: donorEnabled ? 'rgba(0,255,148,0.3)' : 'rgba(255,77,109,0.3)' }]}>
              <PulseDot color={donorEnabled ? C.green : C.red} />
              <Text style={[styles.chipText, { color: donorEnabled ? C.green : C.red, marginLeft: 6 }]}>
                {donorEnabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.modalRow}>
            <Text style={styles.modalKey}>Reserve Battery</Text>
            <Text style={[styles.modalVal, { color: C.amber }]}>{reserveBattery}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.modalRow}>
            <Text style={styles.modalKey}>Max Shareable</Text>
            <Text style={[styles.modalVal, { color: C.cyan }]}>{maxShareable} kWh</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.modalRow}>
            <Text style={styles.modalKey}>Premium Rate</Text>
            <Text style={[styles.modalVal, { color: C.green }]}>
              ₹{Number(extraRate || 0).toFixed(2)}/kWh
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancel} onPress={onCancel} disabled={loading}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalConfirm} onPress={onConfirm} disabled={loading}>
            <LinearGradient colors={['#00D4FF', '#0094CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalConfirmGradient}>
              {loading
                ? <ActivityIndicator size="small" color="#0A0F1E" />
                : <><Ionicons name="checkmark" size={16} color="#0A0F1E" /><Text style={styles.modalConfirmText}>Save</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

/* ── Custom Slider ── */
const CustomSlider = ({ value, min, max, step, suffix, onValueChange, color = C.cyan }: any) => {
  const [width, setWidth] = useState(0);
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (width === 0) return;
        let newX = Math.max(0, Math.min(width, gestureState.moveX - 40));
        let newPercent = newX / width;
        let newValue = min + newPercent * (max - min);
        newValue = Math.round(newValue / step) * step;
        onValueChange(Math.max(min, Math.min(max, newValue)));
      },
      onPanResponderGrant: (evt) => {
        if (width === 0) return;
        let newX = Math.max(0, Math.min(width, evt.nativeEvent.locationX));
        let newPercent = newX / width;
        let newValue = min + newPercent * (max - min);
        newValue = Math.round(newValue / step) * step;
        onValueChange(Math.max(min, Math.min(max, newValue)));
      },
    })
  ).current;

  return (
    <View style={styles.sliderContainer}>
      <Text style={[styles.sliderValue, { color }]}>{value}{suffix}</Text>
      <View
        style={styles.sliderTrackWrap}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${percent}%` as any, backgroundColor: color }]} />
        </View>
        <View style={[styles.sliderThumb, { left: `${percent}%` as any, transform: [{ translateX: -12 }], borderColor: color }]} />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderMinMax}>{min}{suffix}</Text>
        <Text style={styles.sliderMinMax}>{max}{suffix}</Text>
      </View>
    </View>
  );
};

/* ── Setting Row ── */
const SettingCard = ({ icon, color, title, hint, children, disabled }: any) => (
  <View style={[styles.card, disabled && { opacity: 0.45 }]} pointerEvents={disabled ? 'none' : 'auto'}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconWrap, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

export default function PricingScreen() {
  const { userDoc, updateDonationSettings } = useAuth() as any;
  const { role } = useEnergy() as any;
  const [donorEnabled,   setDonorEnabled]   = useState(true);
  const [extraRate,      setExtraRate]      = useState('0');
  const [reserveBattery, setReserveBattery] = useState(30);
  const [maxShareable,   setMaxShareable]   = useState(4);
  const [saving,         setSaving]         = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  /* toast */
  const [toastMsg,     setToastMsg]     = useState('');
  const [toastType,    setToastType]    = useState<'success' | 'info' | 'error'>('info');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMsg(msg); setToastType(type); setToastVisible(true);
  };

  useEffect(() => {
    setDonorEnabled(userDoc?.donorEnabled ?? true);
    setExtraRate(String(userDoc?.donorExtraRatePerKwh ?? 0));
    setReserveBattery(userDoc?.reserveBatteryPercent ?? 30);
    setMaxShareable(userDoc?.maxShareableEnergyKwh ?? 4);
  }, [userDoc]);

  const handleSavePress = () => {
    if (Number.isNaN(Number(extraRate))) {
      showToast('Please enter a valid premium rate.', 'error');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      await withTimeout(
        updateDonationSettings({
          donorEnabled,
          donorExtraRatePerKwh: Number(extraRate),
          reserveBatteryPercent: reserveBattery,
          maxShareableEnergyKwh: maxShareable,
        }),
        SAVE_TIMEOUT_MS
      );
      setConfirmVisible(false);
      showToast('Preferences saved successfully!', 'success');
    } catch (error: any) {
      setConfirmVisible(false);
      showToast(error.message || 'Could not update preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <SmartToast visible={toastVisible} message={toastMsg} type={toastType} onHide={() => setToastVisible(false)} />

      <ConfirmSaveModal
        visible={confirmVisible}
        donorEnabled={donorEnabled}
        reserveBattery={reserveBattery}
        maxShareable={maxShareable}
        extraRate={extraRate}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmVisible(false)}
        loading={saving}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Pricing</Text>
            <Text style={styles.pageSub}>Configure energy trading rules and reserve</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: donorEnabled ? 'rgba(0,255,148,0.1)' : 'rgba(255,77,109,0.1)', borderColor: donorEnabled ? 'rgba(0,255,148,0.3)' : 'rgba(255,77,109,0.3)' }]}>
            <PulseDot color={donorEnabled ? C.green : C.red} />
            <Text style={[styles.statusChipText, { color: donorEnabled ? C.green : C.red, marginLeft: 6 }]}>
              {donorEnabled ? 'SHARING ON' : 'SHARING OFF'}
            </Text>
          </View>
        </View>

        {/* System tariff card */}
        <View style={styles.tariffCard}>
          <LinearGradient colors={['rgba(0,212,255,0.08)', 'transparent']} style={styles.tariffGlow} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Ionicons name="flash" size={18} color={C.cyan} />
            <Text style={styles.tariffTitle}>System Tariff</Text>
          </View>
          <View style={styles.tariffRow}>
            <Text style={styles.tariffKey}>Base Rate</Text>
            <Text style={[styles.tariffVal, { color: C.green }]}>{formatMoney(BASE_RATE_PER_KWH)}/kWh</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.tariffRow}>
            <Text style={styles.tariffKey}>Premium threshold</Text>
            <Text style={[styles.tariffVal, { color: C.amber }]}>{PREMIUM_THRESHOLD_KWH} kWh</Text>
          </View>
        </View>

        {/* Enable sharing */}
        <SettingCard icon="swap-horizontal" color={C.cyan} title="Enable Energy Sharing" hint="Allow neighbors to request your surplus energy.">
          <View style={styles.switchRow}>
            <Text style={{ color: donorEnabled ? C.green : C.textMuted, fontSize: 13, fontWeight: '600' }}>
              {donorEnabled ? 'Active — you can receive share requests' : 'Inactive — no requests will be sent to you'}
            </Text>
            <Switch
              value={donorEnabled}
              onValueChange={setDonorEnabled}
              trackColor={{ false: C.surface2, true: 'rgba(0,212,255,0.35)' }}
              thumbColor={donorEnabled ? C.cyan : '#555'}
            />
          </View>
        </SettingCard>

        {/* Premium rate */}
        <SettingCard icon="pricetag-outline" color={C.amber} title="Selling Premium" hint={`Additional charge after ${PREMIUM_THRESHOLD_KWH} kWh sold.`} disabled={!donorEnabled}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>₹</Text>
            <TextInput
              value={extraRate}
              onChangeText={setExtraRate}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
            />
            <Text style={styles.inputSuffix}>/kWh</Text>
          </View>
        </SettingCard>

        {/* Reserve battery */}
        <SettingCard icon="battery-half-outline" color={C.amber} title="Reserve Battery" hint="Stop sharing if battery drops below this level." disabled={!donorEnabled}>
          <CustomSlider
            value={reserveBattery}
            min={0} max={100} step={5} suffix="%"
            color={C.amber}
            onValueChange={setReserveBattery}
          />
        </SettingCard>

        {/* Max shareable */}
        <SettingCard icon="flash-outline" color={C.green} title="Max Energy Shared" hint="Maximum kWh you are willing to sell per request." disabled={!donorEnabled}>
          <CustomSlider
            value={maxShareable}
            min={1} max={10} step={1} suffix=" kWh"
            color={C.green}
            onValueChange={setMaxShareable}
          />
        </SettingCard>

        <CustomButton title="SAVE PREFERENCES" onPress={handleSavePress} loading={saving} fullWidth />
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle:  { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  pageSub:    { color: C.textSecondary, fontSize: 12, marginTop: 4 },
  statusChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, marginTop: 6 },
  statusChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  tariffCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.cyanBorder, marginBottom: 16, overflow: 'hidden', backgroundColor: 'rgba(0,212,255,0.04)' },
  tariffGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, borderRadius: 20 },
  tariffTitle:{ color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  tariffRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tariffKey:  { color: C.textSecondary, fontSize: 13 },
  tariffVal:  { fontSize: 14, fontWeight: '800' },

  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  cardIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cardTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  cardHint:  { color: C.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, height: 54 },
  inputPrefix: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, color: C.textPrimary, fontSize: 18, fontWeight: '700', height: '100%' },
  inputSuffix: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },

  sliderContainer: { marginTop: 4 },
  sliderValue: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  sliderTrackWrap: { height: 30, justifyContent: 'center' },
  sliderTrack: { height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 4 },
  sliderThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', elevation: 4, borderWidth: 2 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderMinMax: { color: C.textMuted, fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.border },

  /* Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(10,15,30,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal:   { backgroundColor: C.surface, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  modalGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  modalIconWrap: { alignItems: 'center', marginBottom: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: C.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  modalSub:   { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalSummary: { backgroundColor: C.surface2, borderRadius: 16, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  modalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  modalKey:     { color: C.textSecondary, fontSize: 13 },
  modalVal:     { fontSize: 14, fontWeight: '800' },
  chip:         { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  chipText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel:  { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  modalConfirm: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  modalConfirmGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  modalConfirmText: { color: '#0A0F1E', fontWeight: '800', fontSize: 14 },
});
