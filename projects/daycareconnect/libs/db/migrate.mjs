import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, "../../.env") });

// Run drizzle-kit migrate
execSync("drizzle-kit migrate", { stdio: "inherit", cwd: __dirname });
