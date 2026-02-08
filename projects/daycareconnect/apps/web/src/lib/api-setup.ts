import { createApiClient } from "@daycare-hub/services";

createApiClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});
