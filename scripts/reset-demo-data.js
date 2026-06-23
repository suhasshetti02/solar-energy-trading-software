/**
 * reset-demo-data.js
 * Resets the Firestore house documents to demo-ready values.
 * Run with: node scripts/reset-demo-data.js
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCTZT9sI9go1lE0F_ylRdEXMHpCENZ2qpM",
  authDomain: "smart-grid-ea954.firebaseapp.com",
  projectId: "smart-grid-ea954",
  storageBucket: "smart-grid-ea954.firebasestorage.app",
  messagingSenderId: "258721586514",
  appId: "1:258721586514:web:3bd08c01f4466f3774ee8b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Demo scenario:
 *  House A (house_h1) → 15% battery, consuming > generating  → LOW_BATTERY → Request Energy
 *  House B (house_h2) → 80% battery, generating > consuming  → SURPLUS     → Share Energy
 *  House C (house_h3) → 35% battery, consuming > generating  → DEFICIT     → Request Energy
 */
const houses = [
  {
    id: "house_h1",
    data: {
      generation: 1.2,    // kW — low solar
      consumption: 3.5,   // kW — high usage
      battery: 15,        // % — very low → LOW_BATTERY → Request Energy
      reserve: 20,        // % reserve threshold
    },
  },
  {
    id: "house_h2",
    data: {
      generation: 5.5,    // kW — strong solar
      consumption: 1.8,   // kW — low usage
      battery: 82,        // % — high → SURPLUS → Share Energy
      reserve: 20,
    },
  },
  {
    id: "house_h3",
    data: {
      generation: 2.0,    // kW
      consumption: 4.0,   // kW
      battery: 35,        // % → DEFICIT → Request Energy
      reserve: 20,
    },
  },
];

async function resetData() {
  console.log("🔄  Resetting Firestore house data...\n");

  for (const house of houses) {
    const ref = doc(db, "houses", house.id);
    await setDoc(
      ref,
      {
        ...house.data,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(
      `✅  ${house.id}: battery=${house.data.battery}%, ` +
        `gen=${house.data.generation}kW, usage=${house.data.consumption}kW`
    );
  }

  console.log("\n🎉  Done! Reload the app to see updated values.");
  process.exit(0);
}

resetData().catch((err) => {
  console.error("❌  Error:", err);
  process.exit(1);
});
