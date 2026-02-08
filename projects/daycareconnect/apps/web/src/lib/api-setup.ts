import { createApiClient } from "@daycare-hub/services";
import { authClient } from "./auth-client";

createApiClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  onUnauthorized: async () => {
    // Sign out if unauthorized
    await authClient.signOut();
    // Redirect to login
    window.location.href = "/login";
  },
});
