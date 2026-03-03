// PATH: apps/web/src/services/api/client.ts
// WHAT: Shared HTTP client for /api/v1 calls from web
// WHY:  Keeps JSON, auth header, and error mapping in one place
// RELEVANT: apps/web/src/services/auth.ts,apps/web/src/pages/Login.tsx

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const defaultBaseUrl =
  window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:3000'
    : window.location.origin;

type ImportMetaWithOptionalEnv = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

const configuredBaseUrl = (import.meta as ImportMetaWithOptionalEnv).env?.VITE_API_BASE_URL?.trim();

const API_BASE_URL =
  configuredBaseUrl ||
  (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  defaultBaseUrl;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', token, body, signal } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'API_ERROR',
      payload.error?.message ?? 'Request failed',
      payload.error?.details,
    );
  }

  return (await response.json()) as T;
};
