const TOKEN_KEY = 'elo:token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Erro da API com o `code` estável enviado pelo back-end (ex.: "EMAIL_TAKEN"). */
export class ApiError extends Error {
  constructor({ code = 'NETWORK_ERROR', message = 'Falha de conexão', details } = {}, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * fetch com JSON, token e erros padronizados.
 * @param {string} path Caminho relativo a /api.
 * @param {{ method?: string, body?: unknown, query?: Record<string, string | number | undefined> }} [options]
 */
export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });

  const token = tokenStorage.get();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('elo:unauthorized'));
    throw new ApiError(data.error, response.status);
  }
  return data;
}
