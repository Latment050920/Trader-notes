export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const ct = res.headers.get('content-type') || '';

  if (res.status === 204) return {} as T;

  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(JSON.stringify({ status: res.status, ...(data || {}) }));
    }
    return data as T;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(JSON.stringify({ status: res.status, statusText: res.statusText, bodyText: text }));
  }
  throw new Error(JSON.stringify({ status: res.status, statusText: res.statusText, bodyText: text, message: 'Expected JSON response' }));
}
