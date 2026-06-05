import type { JWTPayload } from '../types';

const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 30 * 24 * 60 * 60;

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

function encodeObj(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sign(payload: JWTPayload, secret: string): Promise<string> {
  const header = encodeObj({ alg: 'HS256', typ: 'JWT' });
  const body = encodeObj(payload);
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [header, body, sig] = parts;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    fromB64url(sig),
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) throw new Error('Invalid signature');
  const payload: JWTPayload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export async function signAccessToken(userId: string, username: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, username, jti: crypto.randomUUID(), iat: now, exp: now + ACCESS_TTL }, secret);
}

export async function signRefreshToken(userId: string, username: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, username, jti: crypto.randomUUID(), iat: now, exp: now + REFRESH_TTL }, secret);
}
