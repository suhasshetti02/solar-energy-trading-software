import { useState, useEffect } from 'react';
import { subscribeGridState, GridState } from '../services/hardwareService';

export function useGridState() {
  const [gridState, setGridState] = useState<GridState | null>(null);
  
  useEffect(() => {
    const unsub = subscribeGridState(setGridState);
    return () => unsub();
  }, []);

  const hbStale = gridState?.esp32_heartbeat && typeof gridState.esp32_heartbeat.toMillis === 'function' && 
                  Date.now() - gridState.esp32_heartbeat.toMillis() > 5 * 60 * 1000;
                  
  const isHardwareOffline = !gridState || hbStale;

  return { gridState, isHardwareOffline };
}
