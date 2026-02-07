import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  Object.assign(process.env, env);

  return {
    server: {
      port: 3000,
    },
    envDir: "../../",
    esbuild: {
      jsx: "automatic",
    },
    plugins: [
      tsConfigPaths(),
      tailwindcss(),
      tanstackStart(),
    ],
  };
});
