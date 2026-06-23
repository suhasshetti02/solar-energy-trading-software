import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

export type RequestStatus = "pending" | "accepted" | "transferring" | "completed" | "rejected";

export interface BroadcastRequest {
  id: string;
  receiverId: string;
  receiverHouseId: string;
  receiverDisplayName: string;
  energyNeededKwh: number;
  capPricePerKwh: number;
  status: "open" | "matched" | "payment_pending" | "transferring" | "hardware_confirmed" | "completed" | "expired" | "cancelled";
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
  selectedOfferId?: string;
}

export interface TransferSession {
  id: string;
  requestId: string;
  offerId: string;
  donorId: string;
  donorDisplayName: string;
  receiverId: string;
  receiverDisplayName: string;
  estimatedKwh: number;
  estimatedCost: number;
  status: "transferring" | "hardware_confirmed" | "completed" | "failed";
  switchingConfirmed?: boolean;
  transferStartedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface EnergyOffer {
  id: string;
  requestId: string;
  donorId: string;
  donorHouseId: string;
  donorDisplayName: string;
  energyOfferedKwh: number;
  pricePerKwh: number;
  availabilityTier: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  createdAt?: Timestamp;
}

export interface EnergyRequest {
  id: string;
  fromUserId: string; // Receiver
  fromHouseId: string;
  toUserId: string;   // Donor
  toHouseId: string;
  energyKwh: number;
  status: RequestStatus;
  createdAt?: Timestamp;
}

const COL = "energy_requests";
const TX_COL = "transactions";

export type Unsubscribe = () => void;

export async function createEnergyRequest(params: {
  fromUserId: string;
  fromHouseId: string;
  toUserId: string;
  toHouseId: string;
  energyKwh: number;
}): Promise<string> {
  const energyKwh = Number(params.energyKwh);
  const ref = await addDoc(collection(db, COL), {
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    fromHouseId: params.fromHouseId,
    toHouseId: params.toHouseId,
    energyKwh,
    status: "pending" as const,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Move request to accepted state */
export async function acceptRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, COL, requestId), { status: "accepted" });
}

/** Move request to transferring state */
export async function startTransfer(requestId: string): Promise<void> {
  await updateDoc(doc(db, COL, requestId), { status: "transferring" });
}

/** Atomically complete the transfer */
export async function completeRequest(
  requestId: string,
  donorId: string,
  receiverId: string,
  donorHouseId: string,
  receiverHouseId: string,
  energyKwh: number
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const donorHouseRef = doc(db, "houses", donorHouseId);
    const receiverHouseRef = doc(db, "houses", receiverHouseId);
    const donorUserRef = doc(db, "users", donorId);
    const receiverUserRef = doc(db, "users", receiverId);
    const requestRef = doc(db, COL, requestId);

    const [dH, rH, dU, rU, reqSnap] = await Promise.all([
      transaction.get(donorHouseRef),
      transaction.get(receiverHouseRef),
      transaction.get(donorUserRef),
      transaction.get(receiverUserRef),
      transaction.get(requestRef),
    ]);

    if (!reqSnap.exists() || reqSnap.data().status !== "transferring") {
      throw new Error("Request is not in transferring state.");
    }
    if (!dH.exists() || !rH.exists() || !dU.exists() || !rU.exists()) {
      throw new Error("Missing user or house documents.");
    }

    const donorBattery = Number(dH.data().battery);          // stored as %
    const donorReserve = Number(dU.data().reserveBatteryPercent ?? dH.data().reserve ?? 20); // %
    
    // Battery is stored as a percentage (0-100).
    // We can't directly subtract kWh from a %, but we can check if there's
    // enough headroom above the reserve. If battery is already at or below
    // reserve, deny the transfer.
    if (donorBattery <= donorReserve) {
      throw new Error(`Donor battery (${donorBattery}%) is at or below reserve threshold (${donorReserve}%). Cannot transfer.`);
    }

    const pricePerKwh = 10;
    const totalCost = energyKwh * pricePerKwh;
    
    const receiverWallet = Number(rU.data().walletBalance || 0);
    if (receiverWallet < totalCost) {
      throw new Error(`Receiver has insufficient funds. Needed: Rs. ${totalCost}`);
    }

    // 1. Update Batteries
    transaction.update(donorHouseRef, { battery: donorBattery - energyKwh });
    transaction.update(receiverHouseRef, { battery: Number(rH.data().battery) + energyKwh });

    // 2. Update Wallets
    transaction.update(donorUserRef, { walletBalance: Number(dU.data().walletBalance || 0) + totalCost });
    transaction.update(receiverUserRef, { walletBalance: receiverWallet - totalCost });

    // 3. Mark Request Completed
    transaction.update(requestRef, { status: "completed" });

    // 4. Create Transaction Record
    const txRef = doc(collection(db, TX_COL));
    transaction.set(txRef, {
      requestId,
      donorUserId: donorId,
      receiverUserId: receiverId,
      donor_id: donorId,
      receiver_id: receiverId,
      donor_display_name: dU.data().name || donorHouseId,
      receiver_display_name: rU.data().name || receiverHouseId,
      donorHouseId,
      receiverHouseId,
      energyKwh,
      pricePerKwh,
      totalCost,
      status: "completed",
      createdAt: serverTimestamp(),
    });
  });
}

export async function rejectRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, COL, requestId), { status: "rejected" });
}

export function subscribeIncomingRequests(
  userId: string,
  onData: (requests: EnergyRequest[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, COL), where("toUserId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EnergyRequest);
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      onData(list);
    },
    (e) => onError?.(e as Error),
  );
}

export function subscribeOutgoingRequests(
  userId: string,
  onData: (requests: EnergyRequest[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, COL), where("fromUserId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EnergyRequest);
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      onData(list);
    },
    (e) => onError?.(e as Error),
  );
}

// ----------------------------------------------------
// PHASE 2: BROADCAST & OFFER WORKFLOW
// ----------------------------------------------------

export async function createBroadcastRequest(params: {
  receiverId: string;
  receiverHouseId: string;
  receiverDisplayName: string;
  energyNeededKwh: number;
  capPricePerKwh: number;
}): Promise<string> {
  const ref = await addDoc(collection(db, "broadcast_requests"), {
    ...params,
    status: "open",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitOffer(params: {
  requestId: string;
  donorId: string;
  donorHouseId: string;
  donorDisplayName: string;
  energyOfferedKwh: number;
  pricePerKwh: number;
  availabilityTier: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "energy_offers"), {
    ...params,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  
  // Notification to receiver
  const { getDoc } = await import('firebase/firestore');
  const reqSnap = await getDoc(doc(db, "broadcast_requests", params.requestId));
  if (reqSnap.exists()) {
    const receiverId = reqSnap.data().receiverId;
    await addDoc(collection(db, "notifications"), {
      userId: receiverId,
      title: 'New Offer Received',
      body: `${params.donorDisplayName} offered ${params.energyOfferedKwh} kWh at Rs.${params.pricePerKwh}/kWh.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  return ref.id;
}

export async function acceptOffer(requestId: string, offerId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, "broadcast_requests", requestId);
    const reqSnap = await transaction.get(requestRef);
    if (!reqSnap.exists() || reqSnap.data().status !== "open") {
      throw new Error("Request is no longer open.");
    }

    const offerRef = doc(db, "energy_offers", offerId);
    const offerSnap = await transaction.get(offerRef);
    if (!offerSnap.exists() || offerSnap.data().status !== "pending") {
      throw new Error("Offer is no longer available.");
    }

    const reqData = reqSnap.data();
    const offerData = offerSnap.data();

    // Mark request as payment_pending
    transaction.update(requestRef, {
      status: "payment_pending",
      selectedOfferId: offerId,
    });

    // Mark this offer as accepted
    transaction.update(offerRef, {
      status: "accepted",
    });
  });
  
  // Reject other offers
  const { getDocs, writeBatch } = await import('firebase/firestore');
  const offersQuery = query(collection(db, "energy_offers"), where("requestId", "==", requestId), where("status", "==", "pending"));
  const offersSnap = await getDocs(offersQuery);
  const batch = writeBatch(db);
  offersSnap.forEach(d => {
    if (d.id !== offerId) {
      batch.update(d.ref, { status: "rejected" });
    }
  });
  await batch.commit();

  // Notify donor
  const { getDoc } = await import('firebase/firestore');
  const offerDoc = await getDoc(doc(db, "energy_offers", offerId));
  if (offerDoc.exists()) {
    await addDoc(collection(db, "notifications"), {
      userId: offerDoc.data().donorId,
      title: 'Offer Accepted!',
      body: `Your offer of ${offerDoc.data().energyOfferedKwh} kWh was accepted.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

export function subscribeActiveBroadcast(
  userId: string,
  onData: (request: BroadcastRequest | null) => void,
): Unsubscribe {
  const q = query(collection(db, "broadcast_requests"), where("receiverId", "==", userId), where("status", "==", "open"));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onData(null);
    } else {
      const d = snap.docs[0];
      onData({ id: d.id, ...d.data() } as BroadcastRequest);
    }
  });
}

export function subscribeOpenBroadcastsNearMe(
  userId: string,
  onData: (requests: BroadcastRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, "broadcast_requests"), where("status", "==", "open"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BroadcastRequest))
      .filter((r) => r.receiverId !== userId); // don't show own requests
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    onData(list);
  });
}

export function subscribeOffersForRequest(
  requestId: string,
  onData: (offers: EnergyOffer[]) => void,
): Unsubscribe {
  const q = query(collection(db, "energy_offers"), where("requestId", "==", requestId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnergyOffer));
    list.sort((a, b) => {
      if (a.pricePerKwh !== b.pricePerKwh) {
        return a.pricePerKwh - b.pricePerKwh;
      }
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb; // earliest first
    });
    onData(list);
  });
}

export async function rejectOffer(offerId: string): Promise<void> {
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, "energy_offers", offerId), { status: "rejected" });
}

// ----------------------------------------------------
// PHASE 3: TRANSFER SESSION & SETTLEMENT
// ----------------------------------------------------

export async function confirmPaymentAndStartTransfer(requestId: string, offerId: string, receiverId: string): Promise<string> {
  const { getDoc } = await import('firebase/firestore');
  const reqSnap = await getDoc(doc(db, "broadcast_requests", requestId));
  const offerSnap = await getDoc(doc(db, "energy_offers", offerId));
  const userSnap = await getDoc(doc(db, "users", receiverId));

  if (!reqSnap.exists() || !offerSnap.exists() || !userSnap.exists()) {
    throw new Error("Missing data for payment confirmation.");
  }

  const reqData = reqSnap.data() as BroadcastRequest;
  const offerData = offerSnap.data() as EnergyOffer;
  const userData = userSnap.data();

  const estimatedCost = offerData.energyOfferedKwh * offerData.pricePerKwh;
  const balance = Number(userData.walletBalance || 0);

  if (balance < estimatedCost) {
    throw new Error("Insufficient Wallet Balance");
  }

  // Create transfer session
  const sessionRef = await addDoc(collection(db, "transfer_sessions"), {
    requestId,
    offerId,
    donorId: offerData.donorId,
    donorDisplayName: offerData.donorDisplayName,
    receiverId: reqData.receiverId,
    receiverDisplayName: reqData.receiverDisplayName,
    estimatedKwh: offerData.energyOfferedKwh,
    estimatedCost,
    status: "transferring",
    switchingConfirmed: false,
    transferStartedAt: serverTimestamp(),
  });

  // Update request to transferring
  await updateDoc(doc(db, "broadcast_requests", requestId), {
    status: "transferring"
  });

  // Notify donor
  await addDoc(collection(db, "notifications"), {
    userId: offerData.donorId,
    title: 'Transfer Started',
    body: `Payment confirmed. Energy transfer to ${reqData.receiverDisplayName} is starting.`,
    read: false,
    createdAt: serverTimestamp(),
  });

  // Phase 5: Hardware Command Queue
  const { queueHardwareCommand } = await import('./hardwareService');
  await queueHardwareCommand('START_TRANSFER', {
    requestId: sessionRef.id,
    donorId: offerData.donorId,
    receiverId: reqData.receiverId,
    energyKwh: offerData.energyOfferedKwh,
  });

  return sessionRef.id;
}

export async function completeTransferSession(sessionId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const sessionRef = doc(db, "transfer_sessions", sessionId);
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) throw new Error("Transfer session not found.");
    
    const sessionData = sessionSnap.data() as any;
    if (sessionData.status === "completed") return; // already done
    
    const donorUserRef = doc(db, "users", sessionData.donorId);
    const receiverUserRef = doc(db, "users", sessionData.receiverId);
    const requestRef = doc(db, "broadcast_requests", sessionData.requestId);
    
    const [donorUserSnap, receiverUserSnap, reqSnap] = await Promise.all([
      transaction.get(donorUserRef),
      transaction.get(receiverUserRef),
      transaction.get(requestRef),
    ]);

    if (!donorUserSnap.exists() || !receiverUserSnap.exists() || !reqSnap.exists()) {
      throw new Error("Missing user or request data.");
    }

    const donorBalance = Number(donorUserSnap.data().walletBalance || 0);
    const receiverBalance = Number(receiverUserSnap.data().walletBalance || 0);
    const cost = Number(sessionData.estimatedCost || 0);
    const energyKwh = Number(sessionData.estimatedKwh || 0);

    // Atomic Wallet Updates
    transaction.update(donorUserRef, { walletBalance: donorBalance + cost });
    transaction.update(receiverUserRef, { walletBalance: receiverBalance - cost });

    // Mark Session & Request Completed
    transaction.update(sessionRef, { status: "completed", completedAt: serverTimestamp() });
    transaction.update(requestRef, { status: "completed" });

    // Create Transaction Record
    const txRef = doc(collection(db, TX_COL));
    transaction.set(txRef, {
      donorUserId: sessionData.donorId,
      donor_id: sessionData.donorId,
      donor_display_name: sessionData.donorDisplayName,
      receiverUserId: sessionData.receiverId,
      receiver_id: sessionData.receiverId,
      receiver_display_name: sessionData.receiverDisplayName,
      energyKwh,
      pricePerKwh: cost / (energyKwh || 1), // approximate
      totalCost: cost,
      transferSessionId: sessionId,
      status: "completed",
      createdAt: serverTimestamp(),
    });
  });

  // Notifications
  const { getDoc } = await import('firebase/firestore');
  const sess = await getDoc(doc(db, "transfer_sessions", sessionId));
  if (sess.exists()) {
    const data = sess.data();
    await addDoc(collection(db, "notifications"), {
      userId: data.receiverId,
      title: 'Transfer Completed',
      body: `Successfully received ${data.estimatedKwh} kWh from ${data.donorDisplayName}.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, "notifications"), {
      userId: data.donorId,
      title: 'Payment Received',
      body: `You earned ₹${data.estimatedCost} for transferring ${data.estimatedKwh} kWh.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

export function subscribeActiveTransferSession(
  userId: string,
  onData: (session: TransferSession | null) => void
): Unsubscribe {
  // Finds active transfer session for the user (as donor or receiver)
  // Firestore OR queries require composite indexes or multiple queries, so we do two and merge, or just subscribe where receiverId
  // Wait, user can be receiver OR donor.
  // Actually, we can just use two onSnapshots.
  let currentSession: TransferSession | null = null;
  const qR = query(collection(db, "transfer_sessions"), where("receiverId", "==", userId), where("status", "in", ["transferring", "hardware_confirmed"]));
  const unsubR = onSnapshot(qR, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      currentSession = { id: d.id, ...d.data() } as TransferSession;
      onData(currentSession);
    } else {
      if (currentSession?.receiverId === userId) onData(null);
    }
  });

  const qD = query(collection(db, "transfer_sessions"), where("donorId", "==", userId), where("status", "in", ["transferring", "hardware_confirmed"]));
  const unsubD = onSnapshot(qD, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      currentSession = { id: d.id, ...d.data() } as TransferSession;
      onData(currentSession);
    } else {
      if (currentSession?.donorId === userId) onData(null);
    }
  });

  return () => { unsubR(); unsubD(); };
}
