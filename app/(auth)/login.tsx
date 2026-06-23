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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth() as any;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const DEMO_ACCOUNTS = [
    { label: 'House A', email: 'h1.demo@solarshare.com', password: 'demo1234' },
    { label: 'House B', email: 'h2.demo@solarshare.com', password: 'demo1234' },
    { label: 'House C', email: 'h3.demo@solarshare.com', password: 'demo1234' },
  ];

  const fillDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage('');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both email and password.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(main)/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in could not be completed.');
      Alert.alert('Login Failed', err.message);
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
        {/* Logo / Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.logoRing}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>SolarShare</Text>
          <Text style={styles.brandSub}>Solar-Only Energy Sharing</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>
            Sign in to your account
          </Text>

          {/* Demo quick-fill */}
          <View style={styles.quickAccessCard}>
            <Text style={styles.quickAccessTitle}>⚡ Demo Accounts — tap to fill</Text>
            <View style={styles.quickAccessRow}>
              {DEMO_ACCOUNTS.map((account) => (
                <TouchableOpacity
                  key={account.label}
                  style={[
                    styles.quickChip,
                    email === account.email && {
                      borderColor: '#00E5FF',
                      backgroundColor: '#00E5FF11',
                    },
                  ]}
                  onPress={() => fillDemo(account)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickChipLabel}>{account.label}</Text>
                  <Text style={styles.quickChipSub}>demo</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
            placeholder="••••••••"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <CustomButton
            title="SIGN IN"
            onPress={handleLogin}
            loading={loading}
            variant="auth"
            fullWidth
          />

          {loading && (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Connecting to shared demo</Text>
              <Text style={styles.statusText}>Please wait while Firebase verifies this demo house account.</Text>
            </View>
          )}

          {!loading && Boolean(errorMessage) && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Sign-in issue</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Do not have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D0D0D' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  brandContainer: { alignItems: 'center', marginBottom: 40 },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#00E5FF66',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E5FF11',
    marginBottom: 14,
  },
  logoIcon: { fontSize: 38 },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
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
  quickAccessCard: {
    backgroundColor: '#10161D',
    borderWidth: 1,
    borderColor: '#183744',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  quickAccessTitle: { color: '#D6F7FF', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  quickAccessRow: { flexDirection: 'row', gap: 10 },
  quickChip: {
    flex: 1,
    backgroundColor: '#0C1117',
    borderWidth: 1,
    borderColor: '#214958',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  quickChipLabel: { color: '#00E5FF', fontSize: 14, fontWeight: '800' },
  quickChipSub: { color: '#7F97A4', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
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
    marginBottom: 18,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#00E5FF', fontWeight: '600', fontSize: 14 },
  statusCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1C4B57',
    backgroundColor: '#101A1E',
    padding: 14,
  },
  statusTitle: { color: '#BDEFFF', fontWeight: '700', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { color: '#7FB7C4', fontSize: 12, lineHeight: 18 },
  errorCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4B2327',
    backgroundColor: '#201114',
    padding: 14,
  },
  errorTitle: { color: '#FF8F98', fontWeight: '700', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  errorText: { color: '#E6B5BB', fontSize: 12, lineHeight: 18 },
  demoCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F3840',
    backgroundColor: '#0F171A',
    padding: 14,
  },
  demoTitle: { color: '#00E5FF', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  demoLine: { color: '#9AB5BF', fontSize: 12, lineHeight: 18 },
  demoHint: { color: '#6D8791', fontSize: 11, lineHeight: 16, marginTop: 8 },
});
