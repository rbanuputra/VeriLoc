// Client HTTP tipis ke core-service. Menempelkan access token, dan otomatis
// refresh + retry sekali saat kena 401. Token disimpan di localStorage.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_KEY = 'geoface_access';
const REFRESH_KEY = 'geoface_refresh';

export const tokenStore = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** multipart: kirim FormData langsung (tanpa Content-Type JSON). */
  form?: FormData;
  auth?: boolean; // default true
}

async function rawFetch(path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = {};
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  return fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body });
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  if (data.access_token && data.refresh_token) {
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  }
  return false;
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  let res = await rawFetch(path, opts, tokenStore.access);

  if (res.status === 401 && opts.auth !== false) {
    const ok = await tryRefresh();
    if (ok) {
      res = await rawFetch(path, opts, tokenStore.access);
    } else {
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new ApiError(401, 'Sesi berakhir, silakan login ulang');
    }
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = json?.message
      ? Array.isArray(json.message)
        ? json.message.join(', ')
        : json.message
      : `Request gagal (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return json as T;
}
