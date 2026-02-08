import { config } from "dotenv";
config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { facilities } from "./src/schema/index";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function checkFacilities() {
  console.log("Checking facilities in database...\n");

  // Get all facilities
  const allFacilities = await db.select().from(facilities);

  console.log(`Total facilities: ${allFacilities.length}\n`);

  if (allFacilities.length === 0) {
    console.log("❌ No facilities found in database!");
    console.log("   Run: pnpm db:seed to seed the database");
  } else {
    console.log("Facilities found:");
    console.log("─".repeat(80));
    allFacilities.forEach((facility, index) => {
      console.log(`\n${index + 1}. ${facility.name}`);
      console.log(`   ID: ${facility.id}`);
      console.log(`   Active: ${facility.isActive ? "✅ Yes" : "❌ No"}`);
      console.log(`   Latitude: ${facility.latitude ?? "❌ NULL"}`);
      console.log(`   Longitude: ${facility.longitude ?? "❌ NULL"}`);
      console.log(
        `   Address: ${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}`
      );
      console.log(`   Capacity: ${facility.capacity}`);
      console.log(`   Age Range: ${facility.ageRangeMin}-${facility.ageRangeMax}`);
    });

    // Check which facilities would show up in search
    const searchableFacilities = allFacilities.filter(
      (f) => f.isActive && f.latitude != null && f.longitude != null
    );

    console.log("\n" + "─".repeat(80));
    console.log(
      `\nSearchable facilities (active + has coordinates): ${searchableFacilities.length}`
    );

    if (searchableFacilities.length === 0) {
      console.log("\n❌ PROBLEM FOUND:");
      if (allFacilities.some((f) => !f.isActive)) {
        console.log("   - Some facilities are not active");
      }
      if (allFacilities.some((f) => f.latitude == null || f.longitude == null)) {
        console.log("   - Facilities are missing latitude/longitude coordinates");
        console.log("   - The search endpoint requires coordinates to calculate distance");
        console.log("\n💡 SOLUTION:");
        console.log(
          "   Update the seed file to include latitude/longitude when creating facilities"
        );
        console.log("   Or manually update facilities in the database with coordinates");
      }
    } else {
      console.log("\n✅ These facilities would appear in search results:");
      searchableFacilities.forEach((facility) => {
        console.log(`   - ${facility.name} (${facility.latitude}, ${facility.longitude})`);
      });
    }
  }

  await client.end();
}

checkFacilities().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
