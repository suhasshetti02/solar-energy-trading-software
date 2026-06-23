import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useConnectivity } from "./ConnectivityContext";
import { subscribeUserDoc } from "../services/energyService";
import { initializeUserData } from "../services/initService";
import { auth, db } from "../services/firebase";

export interface UserDoc {
  userId?: string;
  name: string;
  email: string;
  houseId: string;
  house_id?: string;
  walletBalance: number;
  donorEnabled: boolean;
  donorExtraRatePerKwh: number;
  reserveBatteryPercent: number;
  maxShareableEnergyKwh: number;
  createdAt?: any;
}

export interface DonationSettingsPatch {
  donorEnabled?: boolean;
  donorExtraRatePerKwh?: number;
  reserveBatteryPercent?: number;
  maxShareableEnergyKwh?: number;
}

export interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  offline: boolean;
  register: (name: string, email: string, password: string) => Promise<UserCredential | void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
  updateDonationSettings: (patch: DonationSettingsPatch) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const OFFLINE_ERROR_MESSAGES = ["offline", "network", "unavailable", "timed out"];

const isLikelyOfflineError = (err: any) => {
  const errorMessage = String(err?.message || "").toLowerCase();
  const errorCode = String(err?.code || "").toLowerCase();
  return OFFLINE_ERROR_MESSAGES.some(
    (token) => errorMessage.includes(token) || errorCode.includes(token),
  );
};

const normalizeUserDoc = (raw: any): UserDoc | null => {
  if (!raw || typeof raw !== "object") return null;
  const normalizedHouseId =
    (typeof raw.houseId === "string" && raw.houseId.trim()) ||
    (typeof raw.house_id === "string" && raw.house_id.trim()) ||
    "";
  return {
    ...raw,
    houseId: normalizedHouseId,
    house_id: normalizedHouseId,
  } as UserDoc;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  useConnectivity();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setFirebaseUser(nextUser);
      setLoading(false);
      if (nextUser) {
        try {
          await initializeUserData();
        } catch (err: any) {
          console.warn("[AuthContext] initializeUserData failed:", err?.message || err);
        }
      }
      await loadUserDoc(nextUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const unsub = subscribeUserDoc(
      firebaseUser.uid,
      (nextDoc) => {
        setUserDoc(normalizeUserDoc(nextDoc));
        setOffline(false);
      },
      (error: any) => {
        setOffline(isLikelyOfflineError(error));
      },
    );
    return () => unsub();
  }, [firebaseUser?.uid]);

  const loadUserDoc = async (userFromAuth: User | null) => {
    if (!userFromAuth) {
      setUserDoc(null);
      setOffline(false);
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", userFromAuth.uid));
      if (snap.exists()) {
        setUserDoc(normalizeUserDoc(snap.data()));
        setOffline(false);
        return;
      }

      setUserDoc(null);
      setOffline(false);
    } catch (err: any) {
      console.warn("[AuthContext] loadUserDoc failed:", err?.message || err);
      setOffline(isLikelyOfflineError(err));
      setUserDoc(null);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await initializeUserData();
    await loadUserDoc(cred.user);
    return cred;
  };

  const login = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn("[AuthContext] signOut error:", err.message);
    }
    setFirebaseUser(null);
    setUserDoc(null);
    setOffline(false);
  };

  const refreshUserDoc = async () => {
    if (firebaseUser) {
      await loadUserDoc(firebaseUser);
    }
  };

  const updateDonationSettings = async (patch: DonationSettingsPatch) => {
    const nextPatch: DonationSettingsPatch = {};

    if (typeof patch.donorEnabled === "boolean") nextPatch.donorEnabled = patch.donorEnabled;
    if (typeof patch.donorExtraRatePerKwh === "number") {
      nextPatch.donorExtraRatePerKwh = Math.max(
        0,
        parseFloat(patch.donorExtraRatePerKwh.toFixed(2)),
      );
    }
    if (typeof patch.reserveBatteryPercent === "number") {
      nextPatch.reserveBatteryPercent = Math.max(
        0,
        Math.min(100, Math.round(patch.reserveBatteryPercent)),
      );
    }
    if (typeof patch.maxShareableEnergyKwh === "number") {
      nextPatch.maxShareableEnergyKwh = Math.max(
        0,
        parseFloat(patch.maxShareableEnergyKwh.toFixed(2)),
      );
    }

    if (!firebaseUser) throw new Error("Not authenticated");

    try {
      const mapped: any = {};
      if (typeof nextPatch.donorEnabled === "boolean") mapped.donorEnabled = nextPatch.donorEnabled;
      if (typeof nextPatch.donorExtraRatePerKwh === "number") {
        mapped.donorExtraRatePerKwh = nextPatch.donorExtraRatePerKwh;
      }
      if (typeof nextPatch.reserveBatteryPercent === "number") {
        mapped.reserveBatteryPercent = nextPatch.reserveBatteryPercent;
      }
      if (typeof nextPatch.maxShareableEnergyKwh === "number") {
        mapped.maxShareableEnergyKwh = nextPatch.maxShareableEnergyKwh;
      }

      await updateDoc(doc(db, "users", firebaseUser.uid), mapped);
    } catch (err: any) {
      if (isLikelyOfflineError(err)) {
        throw new Error("Unable to save preferences while offline. Please reconnect and try again.");
      }
      throw err;
    }
    setUserDoc((current) => (current ? { ...current, ...nextPatch } : current));
  };

  return (
    <AuthContext.Provider
      value={{
        user: firebaseUser,
        userDoc,
        loading,
        offline,
        register,
        login,
        logout,
        refreshUserDoc,
        updateDonationSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export default AuthContext;
