import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider } from '../src/context/AuthContext';
import { ConnectivityProvider } from '../src/context/ConnectivityContext';
import { EnergyProvider } from '../src/context/EnergyContext';

LogBox.ignoreLogs([
  'Could not reach Cloud Firestore backend',
  'Fetching auth token failed',
]);

export default function RootLayout() {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <EnergyProvider>
          <StatusBar style="light" backgroundColor="#0D0D0D" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </EnergyProvider>
      </AuthProvider>
    </ConnectivityProvider>
  );
}
