export type HouseStatus =
  | "NO_DATA"
  | "OFFLINE"
  | "LOW_BATTERY"
  | "DEFICIT"
  | "SURPLUS"
  | "BALANCED";

export type HouseDataLike = {
  generation?: unknown;
  consumption?: unknown;
  battery?: unknown;
  reserve?: unknown;
  lastUpdated?: any;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const toMillisOrNull = (ts: any): number | null => {
  if (!ts) return null;
  if (typeof ts === "number") return Number.isFinite(ts) ? ts : null;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return null;
};

export function getHouseStatus(
  houseData: HouseDataLike | null | undefined,
): HouseStatus {
  if (!houseData) return "NO_DATA";

  const generation = toNumberOrNull(houseData.generation);
  const consumption = toNumberOrNull(houseData.consumption);
  const battery = toNumberOrNull(houseData.battery);
  const reserve = toNumberOrNull(houseData.reserve);
  const lastUpdatedMs = toMillisOrNull(houseData.lastUpdated);

  // If any required metric is missing, we treat as NO_DATA
  if (
    generation === null ||
    consumption === null ||
    battery === null ||
    reserve === null
  ) {
    return "NO_DATA";
  }

  // Stale timeout: 6 hours — change this value to adjust how long data stays "live"
  const staleMs = 6 * 60 * 60 * 1000; // 6 hours in ms
  const isStaleOrMissing = lastUpdatedMs == null || Date.now() - lastUpdatedMs > staleMs;

  if (isStaleOrMissing) {
    return "OFFLINE";
  }

  if (generation === 0 && consumption === 0) {
    return "OFFLINE";
  }

  if (battery < reserve) {
    return "LOW_BATTERY";
  }

  if (generation > consumption) {
    return "SURPLUS";
  }

  if (generation < consumption) {
    return "DEFICIT";
  }

  return "BALANCED";
}
