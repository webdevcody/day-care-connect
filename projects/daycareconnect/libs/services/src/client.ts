interface ApiClientConfig {
  baseURL: string;
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  onUnauthorized?: () => void;
}

interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  upload<T>(path: string, formData: FormData): Promise<T>;
}

let client: ApiClient | null = null;

export function createApiClient(config: ApiClientConfig): ApiClient {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.getHeaders) {
      const extra = await config.getHeaders();
      Object.assign(headers, extra);
    }

    const response = await fetch(`${config.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (response.status === 401 && config.onUnauthorized) {
      config.onUnauthorized();
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};

    if (config.getHeaders) {
      const extra = await config.getHeaders();
      Object.assign(headers, extra);
    }

    const response = await fetch(`${config.baseURL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (response.status === 401 && config.onUnauthorized) {
      config.onUnauthorized();
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  client = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
    upload: <T>(path: string, formData: FormData) => uploadRequest<T>(path, formData),
  };

  return client;
}

export function getApiClient(): ApiClient {
  if (!client) {
    throw new Error("API client not initialized. Call createApiClient() first.");
  }
  return client;
}
