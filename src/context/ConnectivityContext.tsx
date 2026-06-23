import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type ConnectivityContextType = {
  isOnline: boolean;
  isReachable: boolean;
};

const ConnectivityContext = createContext<ConnectivityContextType | null>(null);

export const ConnectivityProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isReachable, setIsReachable] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected);
      const nextReachable = state.isInternetReachable == null ? nextOnline : Boolean(state.isInternetReachable);
      setIsOnline(nextOnline);
      setIsReachable(nextReachable);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
      isReachable,
    }),
    [isOnline, isReachable]
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
};

export const useConnectivity = () => {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error('useConnectivity must be used inside ConnectivityProvider');
  return ctx;
};

export default ConnectivityContext;
