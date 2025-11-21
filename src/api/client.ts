const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://lasextaapp.onrender.com/api';

export type ApiError = {
  message: string;
  status: number;
};

export type ApiFetchOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  authToken?: string | null;
};

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiFetch<TResponse>(path: string, options: ApiFetchOptions = {}): Promise<TResponse> {
  const { body, headers, authToken, ...rest } = options;
  const finalHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (authToken) {
    finalHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    method: rest.method ?? (body !== undefined ? 'POST' : 'GET'),
    headers: finalHeaders,
    body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : ((body as BodyInit) ?? undefined),
  });

  const contentType = response.headers.get('Content-Type');
  const isJson = contentType?.includes('application/json') ?? false;
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error: ApiError = {
      message: typeof payload?.message === 'string' ? payload.message : 'Error inesperado. Intenta nuevamente.',
      status: response.status,
    };
    throw error;
  }

  return payload as TResponse;
}

export function resolveApiUrl(path: string): string {
  return buildUrl(path);
}



