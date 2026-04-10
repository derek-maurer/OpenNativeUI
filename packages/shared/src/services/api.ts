import { useAuthStore } from "../stores/authStore";
import { API_PATHS } from "../lib/constants";
import type { ModelsResponse, SignInResponse, UserInfo } from "../lib/types";

function getBaseUrl(): string {
  return useAuthStore.getState().serverUrl.replace(/\/+$/, "");
}

function getHeaders(): Record<string, string> {
  const { token } = useAuthStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function throwApiError(status: number, body: string): never {
  throw new ApiError(status, body);
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throwApiError(response.status, await response.text());
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throwApiError(response.status, await response.text());
  }

  return response.json();
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throwApiError(response.status, await response.text());
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

export async function signIn(
  serverUrl: string,
  email: string,
  password: string
): Promise<SignInResponse> {
  const baseUrl = serverUrl.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}${API_PATHS.SIGNIN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Invalid email or password");
  }

  if (response.status === 422) {
    throw new Error("Invalid credentials format");
  }

  if (!response.ok) {
    throw new Error(`Server error (${response.status})`);
  }

  return response.json();
}

export async function validateToken(): Promise<UserInfo> {
  const response = await apiGet<UserInfo>(API_PATHS.AUTH_VERIFY);
  return response;
}

export async function validateConnection(): Promise<boolean> {
  try {
    await apiGet<ModelsResponse>(API_PATHS.MODELS);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(ApiError.friendlyMessage(status));
    this.name = "ApiError";
  }

  static friendlyMessage(status: number): string {
    switch (status) {
      case 401:
        return "Session expired — please sign in again";
      case 403:
        return "Access denied";
      case 422:
        return "Invalid request";
      case 429:
        return "Rate limited — please wait and try again";
      case 500:
        return "Server error";
      case 502:
      case 503:
        return "Server is unavailable";
      default:
        return `Request failed (${status})`;
    }
  }
}
