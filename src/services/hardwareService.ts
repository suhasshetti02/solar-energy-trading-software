import { collection, doc, onSnapshot, query, where, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface GridState {
  availability_mode?: 'GRID' | 'BATTERY' | 'P2P' | 'DUMP_LOAD';
  bus_source?: 'GRID' | 'BATTERY' | 'P2P' | 'DUMP_LOAD';
  esp32_heartbeat?: any; // Timestamp
  switching_confirmed?: boolean;
  contactor_1?: boolean;
  contactor_2?: boolean;
  contactor_3?: boolean;
}

export type Unsubscribe = () => void;

/** Subscribe to the system grid state */
export function subscribeGridState(
  onData: (data: GridState | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = doc(db, 'system', 'grid_state');
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? (snap.data() as GridState) : null);
    },
    (err) => onError?.(err)
  );
}

/** 
 * Push a new command to the hardware_commands queue 
 * The ESP32 listens to this collection and executes the requested command type.
 */
export async function queueHardwareCommand(commandType: string, payload: Record<string, any> = {}): Promise<string> {
  const col = collection(db, 'hardware_commands');
  const ref = await addDoc(col, {
    commandType,
    ...payload,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing command (usually done by ESP32, but just in case) */
export async function updateHardwareCommand(commandId: string, updates: Record<string, any>): Promise<void> {
  const ref = doc(db, 'hardware_commands', commandId);
  await updateDoc(ref, updates);
}

/** Subscribe to a specific command to track its progress (e.g. pending -> acknowledged -> completed) */
export function subscribeHardwareCommand(
  commandId: string,
  onData: (data: any) => void
): Unsubscribe {
  const ref = doc(db, 'hardware_commands', commandId);
  return onSnapshot(ref, (snap) => onData(snap.data()));
}

/** Log a hardware event (usually done by ESP32, but useful for manual triggers/faults) */
export async function logHardwareEvent(eventType: string, details: string, metadata: any = {}): Promise<void> {
  const col = collection(db, 'hardware_events');
  await addDoc(col, {
    eventType,
    details,
    metadata,
    createdAt: serverTimestamp(),
  });
}

/** Subscribe to recent hardware events for the system log */
export function subscribeHardwareEvents(
  onData: (events: any[]) => void,
  limitCount = 50
): Unsubscribe {
  const col = collection(db, 'hardware_events');
  // we would use orderBy('createdAt', 'desc') and limit(limitCount), but we don't know if the composite index exists.
  // Instead, we just fetch all or rely on a simple query and sort client-side.
  const q = query(col);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => ((b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    onData(list.slice(0, limitCount));
  });
}
