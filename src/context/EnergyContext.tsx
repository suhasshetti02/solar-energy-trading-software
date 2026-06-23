import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

export type EnergyRole = 'donor' | 'receiver' | null;

export interface EnergyContextType {
  role: EnergyRole;
}

const EnergyContext = createContext<EnergyContextType | null>(null);

export const EnergyProvider = ({ children }: { children: ReactNode }) => {
  const { userDoc } = useAuth();

  const role: EnergyRole = useMemo(() => {
    if (!userDoc) return null;
    return userDoc.donorEnabled ? 'donor' : 'receiver';
  }, [userDoc]);

  return (
    <EnergyContext.Provider value={{ role }}>
      {children}
    </EnergyContext.Provider>
  );
};

export const useEnergy = (): EnergyContextType => {
  const ctx = useContext(EnergyContext);
  if (!ctx) throw new Error('useEnergy must be used inside EnergyProvider');
  return ctx;
};

export default EnergyContext;
