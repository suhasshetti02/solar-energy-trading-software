import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import { Platform } from "react-native";

import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  initializeFirestore,
  setLogLevel,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTZT9sI9go1lE0F_ylRdEXMHpCENZ2qpM",
  authDomain: "smart-grid-ea954.firebaseapp.com",
  databaseURL: "https://smart-grid-ea954-default-rtdb.firebaseio.com",
  projectId: "smart-grid-ea954",
  storageBucket: "smart-grid-ea954.firebasestorage.app",
  messagingSenderId: "258721586514",
  appId: "1:258721586514:web:3bd08c01f4466f3774ee8b",
  measurementId: "G-YRKD7P7GXX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  if (Platform.OS === "web") {
    auth = FirebaseAuth.initializeAuth(app, {
      persistence: FirebaseAuth.browserLocalPersistence,
    });
  } else if (
    typeof (FirebaseAuth as any).getReactNativePersistence === "function"
  ) {
    auth = FirebaseAuth.initializeAuth(app, {
      persistence: (FirebaseAuth as any).getReactNativePersistence(
        AsyncStorage,
      ),
    });
  } else {
    auth = FirebaseAuth.getAuth(app);
  }
} catch {
  auth = FirebaseAuth.getAuth(app);
}

// React Native transports are more reliable with long polling in Expo/Expo Go.
let db: Firestore;
try {
  if (Platform.OS === "web") {
    db = getFirestore(app);
  } else {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }
} catch {
  db = getFirestore(app);
}

// Connect to Firestore Emulator only when explicitly enabled.
const useFirestoreEmulator =
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";
if (__DEV__ && useFirestoreEmulator) {
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  connectFirestoreEmulator(db, host, 8082); // Change port if needed
}

setLogLevel("silent");

export { auth, db };
export default app;
