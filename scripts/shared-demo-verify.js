const {
  demoHouses,
  loadSignedInSessions,
  readDocument,
} = require("./shared-demo-utils");

async function main() {
  const failures = [];

  console.log("Signing in demo accounts for verification...");
  const sessions = await loadSignedInSessions();
  const verifier = sessions[0];

  console.log("Checking demo_houses...");
  for (const house of demoHouses) {
    const result = await readDocument("demo_houses", house.houseId, verifier.idToken);
    if (!result.exists) {
      failures.push(`Missing demo_houses/${house.houseId}`);
      continue;
    }
    const actual = result.data || {};
    if (actual.houseId !== house.houseId) failures.push(`demo_houses/${house.houseId} has wrong houseId`);
    if (Number(actual.generation) !== Number(house.generation)) failures.push(`demo_houses/${house.houseId} generation mismatch`);
    if (Number(actual.consumption) !== Number(house.consumption)) failures.push(`demo_houses/${house.houseId} consumption mismatch`);
  }

  console.log("Checking demo_users and demo_availability...");
  for (const session of sessions) {
    const userDoc = await readDocument("demo_users", session.uid, session.idToken);
    if (!userDoc.exists) {
      failures.push(`Missing demo_users/${session.uid} for ${session.email}`);
    } else {
      const actual = userDoc.data || {};
      if (actual.email !== session.email) failures.push(`demo_users/${session.uid} email mismatch`);
      if (actual.houseId !== session.houseId) failures.push(`demo_users/${session.uid} houseId mismatch`);
      if (Number(actual.batteryLevel) !== Number(session.batteryLevel)) failures.push(`demo_users/${session.uid} batteryLevel mismatch`);
    }

    const availabilityDoc = await readDocument("demo_availability", session.uid, session.idToken);
    if (!availabilityDoc.exists) {
      failures.push(`Missing demo_availability/${session.uid} for ${session.houseId}`);
    }
  }

  if (failures.length > 0) {
    console.error("Shared demo verification failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log("Shared demo verification passed.");
}

main().catch((error) => {
  console.error("Shared demo verification crashed:", error.message || error);
  process.exitCode = 1;
});
