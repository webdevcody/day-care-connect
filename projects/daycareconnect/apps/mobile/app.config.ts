import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DayCareConnect",
  slug: "daycare-connect",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#2563eb",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.daycareconnect.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#2563eb",
    },
    package: "com.daycareconnect.app",
  },
  extra: {
    apiUrl: process.env.API_URL || "http://localhost:3000",
  },
  plugins: ["expo-secure-store", "expo-notifications"],
});
