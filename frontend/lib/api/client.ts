const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("odoo_deployer_token") || localStorage.getItem("kaffin_token");
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("odoo_deployer_token", token);
    localStorage.setItem("kaffin_token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("odoo_deployer_token");
    localStorage.removeItem("kaffin_token");
    localStorage.removeItem("kaffin_user");
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = cleanEndpoint.startsWith("http") ? cleanEndpoint : `${API_BASE}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API Error (${response.status})`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // If endpoint is a list endpoint and connection failed, return clean empty list
    if (
      cleanEndpoint.endsWith("/servers") ||
      cleanEndpoint.endsWith("/instances") ||
      cleanEndpoint.endsWith("/deployments") ||
      cleanEndpoint.endsWith("/addons") ||
      cleanEndpoint.endsWith("/domains") ||
      cleanEndpoint.endsWith("/backups") ||
      cleanEndpoint.endsWith("/users") ||
      cleanEndpoint.endsWith("/organizations") ||
      cleanEndpoint.endsWith("/logs")
    ) {
      return [] as unknown as T;
    }

    throw error;
  }
}
