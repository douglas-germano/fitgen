import * as SecureStore from './storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://fitgen.suacozinha.site/api';
export const MEDIA_URL = process.env.EXPO_PUBLIC_MEDIA_URL ?? API_URL.replace(/\/api\/?$/, '');
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://fitgen.suacozinha.site';

const KEYS = {
  access: 'fitgen.access_token',
  refresh: 'fitgen.refresh_token',
} as const;

// Tokens live in the device keychain/keystore; this in-memory copy avoids an
// async read on every request.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let subscriptionRequiredHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  data: unknown;
  /** Route template of the failed request (`/workouts/:id`), used to group errors in Sentry. */
  endpoint?: string;

  constructor(message: string, status: number, data?: unknown, endpoint?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;
  }
}

/** `/workouts/12/days/3?x=1` → `/workouts/:id/days/:id` (ids, uuids and query strings out, so one route = one group). */
export function endpointTemplate(endpoint: string) {
  return endpoint
    .split('?')[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

export async function loadTokens(): Promise<boolean> {
  [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
  ]);
  return accessToken !== null;
}

export async function saveTokens(access: string, refresh?: string | null) {
  accessToken = access;
  await SecureStore.setItemAsync(KEYS.access, access);
  if (refresh) {
    refreshToken = refresh;
    await SecureStore.setItemAsync(KEYS.refresh, refresh);
  } else {
    refreshToken = null;
    await SecureStore.deleteItemAsync(KEYS.refresh);
  }
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.access),
    SecureStore.deleteItemAsync(KEYS.refresh),
  ]);
}

/** Called when the session can't be recovered (refresh failed). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/** Called when the API answers 402 `subscription_required` (hard-gate mode: trial/subscription ended). */
export function setSubscriptionRequiredHandler(handler: (() => void) | null) {
  subscriptionRequiredHandler = handler;
}

let premiumRequiredHandler: ((feature?: string) => void) | null = null;

/** Called when the API answers 402 `premium_required` (freemium: an AI feature needs Premium). */
export function setPremiumRequiredHandler(handler: ((feature?: string) => void) | null) {
  premiumRequiredHandler = handler;
}

/** True for the 402 a free user gets from a Premium-only feature (the paywall is already opening). */
export function isPremiumRequired(error: unknown) {
  return error instanceof Error && error.name === 'ApiError' && (error as ApiError).status === 402 &&
    ((error as ApiError).data as { code?: string } | undefined)?.code === 'premium_required';
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  // Concurrent 401s share a single refresh request.
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.access_token) return false;
      await saveTokens(data.access_token, data.refresh_token ?? refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the auth header and the refresh/sign-out flow (login, register…). */
  public?: boolean;
  /** Some endpoints use 401 for incorrect form credentials, not an expired session. */
  recoverSession?: boolean;
};

async function parseBody(res: Response) {
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return res.json();
  const text = await res.text();
  // Error pages from the server or a proxy (Flask 404/405, gateway 502) are HTML, never a message for the user.
  if (!res.ok && (type.includes('text/html') || /^\s*</.test(text))) return null;
  return { message: text || res.statusText };
}

/** What to say when the server gave no message of its own. */
function statusMessage(status: number) {
  if (status === 404 || status === 405) return 'Este recurso ainda não está disponível. Atualize o app ou tente novamente mais tarde.';
  if (status === 429) return 'Muitas tentativas seguidas. Aguarde um pouco e tente novamente.';
  if (status >= 500) return 'O servidor está com instabilidade. Tente novamente em instantes.';
  return `Falha na requisição (${status})`;
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (!options.public && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (res.status === 401 && !options.public && options.recoverSession !== false) {
    if (!isRetry && (await refreshAccessToken())) {
      return api<T>(endpoint, options, true);
    }
    await clearTokens();
    unauthorizedHandler?.();
    throw new ApiError('Sua sessão expirou. Entre novamente.', 401, undefined, endpointTemplate(endpoint));
  }

  const data = await parseBody(res);
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code;
    if (res.status === 402 && code === 'subscription_required') subscriptionRequiredHandler?.();
    if (res.status === 402 && code === 'premium_required') {
      premiumRequiredHandler?.((data as { feature?: string }).feature);
      throw new ApiError('Esse recurso faz parte do FitGen Premium.', 402, data, endpointTemplate(endpoint));
    }
    const fields = data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors).flat().filter((v): v is string => typeof v === 'string').join('\n') : '';
    const message = fields ||
      (data?.msg ?? data?.message ?? data?.error ?? statusMessage(res.status));
    throw new ApiError(String(message), res.status, data, endpointTemplate(endpoint));
  }
  return data as T;
}

export function errorMessage(error: unknown, fallback = 'Algo deu errado.') {
  if (error instanceof TypeError || (error instanceof Error && /fetch failed|network|connection was lost/i.test(error.message))) return 'Sem conexão com o servidor. Verifique a rede e tente novamente.';
  // Fast Refresh can leave an error instance created by the previous module.
  if (error instanceof Error && error.name === 'ApiError') return error.message;
  return fallback;
}
