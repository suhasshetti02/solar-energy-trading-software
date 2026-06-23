const {
  demoHouses,
  loadSignedInSessions,
  writeDocument,
  buildUserPayload,
  buildHousePayload,
  buildAvailabilityPayload,
} = require("./shared-demo-utils");

async function main() {
  console.log("Signing in demo accounts...");
  const sessions = await loadSignedInSessions();
  const adminLikeSession = sessions[0];

  console.log("Seeding houses...");
  for (const house of demoHouses) {
    await writeDocument("houses", house.houseId, buildHousePayload(house), adminLikeSession.idToken);
    console.log(`  upserted houses/${house.houseId}`);
  }

  console.log("Seeding users and availability...");
  for (const session of sessions) {
    await writeDocument("users", session.uid, buildUserPayload(session), session.idToken);
    console.log(`  upserted users/${session.uid} (${session.email})`);

    await writeDocument("availability", session.uid, buildAvailabilityPayload(session), session.idToken);
    console.log(`  upserted availability/${session.uid} (${session.houseId})`);
  }

  console.log("Shared demo seed complete.");
}

main().catch((error) => {
  console.error("Shared demo seed failed:", error.message || error);
  process.exitCode = 1;
});
