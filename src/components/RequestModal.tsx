import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  surface2: '#1A2235',
  border: 'rgba(30,58,95,0.6)',
  cyan: '#00D4FF',
  green: '#00FF94',
  red: '#FF4D6D',
  textPrimary: '#F0F6FF',
  textSecondary: '#8BA0BC',
  textMuted: '#3D4F63',
};

interface RequestModalProps {
  isVisible: boolean;
  onClose: () => void;
  donor: any;
  onSubmit: (units: number) => Promise<void>;
  userWalletBalance: number;
}

export default function RequestModal({
  isVisible,
  onClose,
  donor,
  onSubmit,
  userWalletBalance,
}: RequestModalProps) {
  const [energyInput, setEnergyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setEnergyInput('');
      setError(null);
    }
  }, [isVisible]);

  if (!donor) return null;

  const requestedEnergy = parseFloat(energyInput);
  const isInvalidEnergy = isNaN(requestedEnergy) || requestedEnergy <= 0;
  const pricePerKwh = donor.pricePerKwh ?? 10;
  const totalCost = isInvalidEnergy ? 0 : requestedEnergy * pricePerKwh;
  const availableEnergy = donor.availableEnergy ?? 0;

  const handleConfirm = async () => {
    if (isInvalidEnergy) {
      setError('Please enter a valid energy amount.');
      return;
    }
    if (requestedEnergy > availableEnergy) {
      setError(`Cannot request more than ${availableEnergy} kWh.`);
      return;
    }
    if (totalCost > userWalletBalance) {
      setError('Insufficient wallet balance for this request.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(requestedEnergy);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Request Energy</Text>
          <Text style={styles.subtitle}>from {donor.name || 'Donor'}</Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Available</Text>
              <Text style={styles.infoValue}>{availableEnergy.toFixed(1)} kWh</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate</Text>
              <Text style={styles.infoValue}>Rs. {pricePerKwh.toFixed(2)} / kWh</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Your Wallet</Text>
              <Text style={styles.infoValue}>Rs. {userWalletBalance.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Energy to Request (kWh)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 2.5"
            placeholderTextColor={C.textMuted}
            value={energyInput}
            onChangeText={(text) => {
              setEnergyInput(text);
              setError(null);
            }}
            editable={!loading}
          />

          <View style={styles.costContainer}>
            <Text style={styles.costLabel}>Total Cost</Text>
            <Text style={[styles.costValue, totalCost > userWalletBalance && styles.costError]}>
              Rs. {totalCost.toFixed(2)}
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (isInvalidEnergy || requestedEnergy > availableEnergy || totalCost > userWalletBalance) && styles.disabledBtn
              ]}
              onPress={handleConfirm}
              disabled={loading || isInvalidEnergy || requestedEnergy > availableEnergy || totalCost > userWalletBalance}
            >
              {loading ? (
                <ActivityIndicator color={C.bg} size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomWidth: 0,
  },
  title: {
    color: C.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: C.cyan,
    fontSize: 14,
    marginBottom: 20,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: C.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    color: C.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.textPrimary,
    fontSize: 18,
    padding: 16,
    marginBottom: 20,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(0,212,255,0.05)',
    padding: 16,
    borderRadius: 12,
  },
  costLabel: {
    color: C.cyan,
    fontSize: 16,
    fontWeight: '700',
  },
  costValue: {
    color: C.cyan,
    fontSize: 20,
    fontWeight: '800',
  },
  costError: {
    color: C.red,
  },
  errorText: {
    color: C.red,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: C.cyan,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: C.bg,
    fontSize: 16,
    fontWeight: '800',
  },
});
