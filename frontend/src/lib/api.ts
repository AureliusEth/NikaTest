export type ApiOptions = {
	baseUrl?: string;
	userId?: string;
};

const defaultBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function api<T>(path: string, init?: RequestInit, opts?: ApiOptions): Promise<T> {
	const base = opts?.baseUrl || defaultBase;
	const headers = new Headers(init?.headers || {});
	const userId = opts?.userId || (typeof window !== 'undefined' ? localStorage.getItem('x-user-id') || '' : '');
	if (userId) headers.set('x-user-id', userId);
	headers.set('content-type', 'application/json');
	const res = await fetch(`${base}${path}`, { ...init, headers });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `HTTP ${res.status}`);
	}
	return (await res.json()) as T;
}


