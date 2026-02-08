import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { execSync } from "child_process";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function reset() {
  console.log("Resetting database...");

  // Drop all schemas (public and drizzle) to ensure clean state
  const client = postgres(connectionString);
  try {
    // Drop drizzle schema if it exists (contains migration tracking)
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    
    // Drop public schema and recreate it
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`CREATE SCHEMA public`;
    await client`GRANT ALL ON SCHEMA public TO postgres`;
    await client`GRANT ALL ON SCHEMA public TO public`;
    
    console.log("Database cleared successfully");
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Use push instead of migrate for a clean reset - it recreates tables from schema directly
  console.log("Recreating database schema...");
  execSync("drizzle-kit push", { stdio: "inherit", cwd: __dirname });

  // Run seed
  console.log("Seeding database...");
  execSync("tsx src/seed.ts", { stdio: "inherit", cwd: __dirname });

  console.log("Database reset complete!");
}

reset().catch((error) => {
  console.error("Error during reset:", error);
  process.exit(1);
});
