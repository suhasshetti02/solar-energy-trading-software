const { firebaseConfig, demoAccounts, demoHouses, calculatePricing } = require("./shared-demo-config");

const projectId = firebaseConfig.projectId;
const apiKey = firebaseConfig.apiKey;
const databaseRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const authSignInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

const nowIso = () => new Date().toISOString();

const toFirestoreValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "object") {
    const fields = {};
    Object.entries(value).forEach(([key, nested]) => {
      fields[key] = toFirestoreValue(nested);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
};

const fromFirestoreValue = (value) => {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    const result = {};
    Object.entries(value.mapValue.fields || {}).forEach(([key, nested]) => {
      result[key] = fromFirestoreValue(nested);
    });
    return result;
  }
  return null;
};

const documentUrl = (collectionName, docId) => `${databaseRoot}/${collectionName}/${encodeURIComponent(docId)}`;

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data?.error?.message || `${response.status} ${response.statusText}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};

const signInDemoAccount = async (account) => {
  const data = await fetchJson(authSignInUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      returnSecureToken: true,
    }),
  });

  return {
    ...account,
    uid: data.localId,
    idToken: data.idToken,
  };
};

const writeDocument = async (collectionName, docId, data, idToken) => {
  const body = {
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
    ),
  };

  return fetchJson(documentUrl(collectionName, docId), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
};

const readDocument = async (collectionName, docId, idToken) => {
  try {
    const data = await fetchJson(documentUrl(collectionName, docId), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    return {
      exists: true,
      raw: data,
      data: Object.fromEntries(
        Object.entries(data.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])
      ),
    };
  } catch (error) {
    if (error.status === 404) {
      return { exists: false, raw: null, data: null };
    }
    throw error;
  }
};

const buildUserPayload = (session) => ({
  uid: session.uid,
  userId: session.uid,
  name: session.name,
  email: session.email,
  houseId: session.houseId,
  walletBalance: session.walletBalance,
  battery: session.battery,
  donorEnabled: session.donorEnabled,
  donorExtraRatePerKwh: session.donorExtraRatePerKwh,
  reserveBatteryPercent: session.reserveBatteryPercent,
  maxShareableEnergyKwh: session.maxShareableEnergyKwh,
  status: session.status || "active",
  updatedAt: nowIso(),
  createdAt: nowIso(),
});

const buildHousePayload = (house) => ({
  ...house,
  lastUpdated: nowIso(),
  createdAt: nowIso(),
});

const buildAvailabilityPayload = (session) => {
  const house = demoHouses.find((item) => item.houseId === session.houseId);
  const generation = Number(house?.generation ?? 0);
  const consumption = Number(house?.consumption ?? 0);
  const connectedHouseIds = house?.connectedHouseIds ?? [];
  const surplusEnergyKwh = Math.max(0, generation - consumption);
  const isAvailable =
    session.status === "active" &&
    session.donorEnabled &&
    connectedHouseIds.length > 0 &&
    surplusEnergyKwh > 0 &&
    session.battery > session.reserveBatteryPercent &&
    session.maxShareableEnergyKwh > 0;
  const availableEnergyKwh = isAvailable ? Math.min(session.maxShareableEnergyKwh, surplusEnergyKwh) : 0;

  return {
    userId: session.uid,
    name: session.name,
    houseId: session.houseId,
    connectedHouseIds,
    battery: session.battery,
    reserveBatteryPercent: session.reserveBatteryPercent,
    donorEnabled: session.donorEnabled,
    donorExtraRatePerKwh: session.donorExtraRatePerKwh,
    maxShareableEnergyKwh: session.maxShareableEnergyKwh,
    generation,
    consumption,
    availableEnergyKwh: Number(availableEnergyKwh.toFixed(2)),
    isAvailable,
    status: session.status || "active",
    pricing: calculatePricing(Math.max(availableEnergyKwh, 1), session.donorExtraRatePerKwh),
    updatedAt: nowIso(),
  };
};

const loadSignedInSessions = async () => {
  const sessions = [];
  for (const account of demoAccounts) {
    const session = await signInDemoAccount(account);
    sessions.push(session);
  }
  return sessions;
};

module.exports = {
  demoAccounts,
  demoHouses,
  firebaseConfig,
  loadSignedInSessions,
  readDocument,
  signInDemoAccount,
  writeDocument,
  buildUserPayload,
  buildHousePayload,
  buildAvailabilityPayload,
};
