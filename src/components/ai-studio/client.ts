/*
  The one way AI Studio client components call their own API. Always JSON (so
  the same-origin + content-type CSRF check passes), always same-origin
  credentials, and always a typed { ok, data | error } result so callers never
  have to guess what a failed fetch looks like.
*/

// A flat shape rather than a discriminated union: tsconfig has strictNullChecks
// off, which disables narrowing on `ok`, so a union would not type-check.
export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  status: number;
  code: string;
  message: string;
}

export async function studioApi<T = Record<string, unknown>>(
  url: string,
  body: unknown = {},
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    const parsed = (await response.json().catch(() => null)) as
      | ({ ok?: boolean; error?: { code?: string; message?: string } } & T)
      | null;
    if (response.ok && parsed) return { ok: true, data: parsed as T, status: response.status, code: "ok", message: "" };
    return {
      ok: false,
      data: null,
      status: response.status,
      code: parsed?.error?.code ?? "error",
      message: parsed?.error?.message ?? "Something went wrong. Please try again.",
    };
  } catch {
    return { ok: false, data: null, status: 0, code: "network", message: "Couldn't reach the server. Check your connection." };
  }
}
