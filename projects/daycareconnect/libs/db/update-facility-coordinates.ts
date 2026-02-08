import { config } from "dotenv";
config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, or, isNull } from "drizzle-orm";
import { facilities } from "./src/schema/index";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function updateFacilityCoordinates() {
  console.log("Updating facility coordinates...\n");

  // Get all facilities without coordinates
  const facilitiesWithoutCoords = await db
    .select()
    .from(facilities)
    .where(or(isNull(facilities.latitude), isNull(facilities.longitude)));

  console.log(`Found ${facilitiesWithoutCoords.length} facilities without coordinates\n`);

  // Update coordinates based on address
  for (const facility of facilitiesWithoutCoords) {
    let latitude: string | null = null;
    let longitude: string | null = null;

    // Springfield, IL - approximate coordinates
    if (facility.city === "Springfield" && facility.state === "IL") {
      latitude = "39.7817";
      longitude = "-89.6501";
    }
    // For other facilities, use a default location (you may want to geocode these properly)
    else {
      // Default to a central US location if we can't determine coordinates
      latitude = "39.8283"; // Center of US
      longitude = "-98.5795";
      console.log(
        `⚠️  Using default coordinates for: ${facility.name} (${facility.city}, ${facility.state})`
      );
    }

    if (latitude && longitude) {
      await db
        .update(facilities)
        .set({
          latitude,
          longitude,
        })
        .where(eq(facilities.id, facility.id));

      console.log(`✅ Updated ${facility.name}: ${latitude}, ${longitude}`);
    }
  }

  // Verify all facilities now have coordinates
  const allFacilities = await db.select().from(facilities);
  const facilitiesWithCoords = allFacilities.filter(
    (f) => f.latitude != null && f.longitude != null
  );

  console.log(
    `\n✅ ${facilitiesWithCoords.length}/${allFacilities.length} facilities now have coordinates`
  );

  await client.end();
}

updateFacilityCoordinates().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
