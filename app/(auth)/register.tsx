import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import CustomButton from '../../src/components/CustomButton';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth() as any;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/(main)/dashboard');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandContainer}>
          <View style={styles.logoRing}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>Join SolarShare</Text>
          <Text style={styles.brandSub}>Create your solar home account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>
            Share solar energy with nearby homes
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Aarav Sharma"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor="#555"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          {/* Wallet info pill */}
          <View style={styles.infoPill}>
            <Text style={styles.infoText}>💰 ₹1,000 welcome balance included</Text>
          </View>

          <CustomButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            variant="auth"
            fullWidth
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D0D0D' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  brandContainer: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#00FF8866',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF8811',
    marginBottom: 12,
  },
  logoIcon: { fontSize: 34 },
  brandTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  brandSub: { color: '#555', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSub: { color: '#666', fontSize: 13, marginBottom: 24 },
  label: { color: '#B0B0B0', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  infoPill: {
    backgroundColor: '#00FF8811',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#00FF8833',
    marginBottom: 18,
  },
  infoText: { color: '#00FF88', fontSize: 13, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#00E5FF', fontWeight: '600', fontSize: 14 },
});
