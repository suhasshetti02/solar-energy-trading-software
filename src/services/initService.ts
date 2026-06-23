import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const inferDemoHouseIdFromEmail = (email?: string | null) => {
  const raw = String(email || "").trim().toLowerCase();
  const match = raw.match(/^h(\d+)\.demo@/);
  if (!match) return null;
  return `house_h${match[1]}`;
};

export async function initializeUserData() {
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;
  const generatedHouseId = `house_${uid.slice(0, 6)}`;

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  const existing = userSnap.exists() ? userSnap.data() : null;
  const existingHouseId =
    existing && typeof existing.houseId === "string" && existing.houseId.trim()
      ? existing.houseId.trim()
      : existing && typeof existing.house_id === "string" && existing.house_id.trim()
        ? existing.house_id.trim()
        : null;

  const inferredDemoHouseId = inferDemoHouseIdFromEmail(user.email);
  const effectiveHouseId = existingHouseId || inferredDemoHouseId || generatedHouseId;

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.email?.split("@")[0] || "User",
      email: user.email || "",
      houseId: effectiveHouseId,
      house_id: effectiveHouseId,
      walletBalance: 500,
      donorEnabled: false,
      donorExtraRatePerKwh: 0,
      reserveBatteryPercent: 30,
      maxShareableEnergyKwh: 4,
      createdAt: serverTimestamp(),
    });
  }

  const houseRef = doc(db, "houses", effectiveHouseId);
  const houseSnap = await getDoc(houseRef);

  if (!houseSnap.exists()) {
    await setDoc(houseRef, {
      generation: 2,
      consumption: 3,
      battery: 50,
      reserve: 30,
      lastUpdated: serverTimestamp(),
    });
  }
}
