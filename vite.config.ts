import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart(), react()],
});
