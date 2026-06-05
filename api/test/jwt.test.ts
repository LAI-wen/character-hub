import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyToken } from '../src/auth/jwt';

const SECRET = 'test-secret-32-chars-long-enough!!';

describe('jwt', () => {
  it('signs and verifies an access token', async () => {
    const token = await signAccessToken('user-1', 'yoigiri', SECRET);
    const payload = await verifyToken(token, SECRET);
    expect(payload.sub).toBe('user-1');
    expect(payload.username).toBe('yoigiri');
    expect(payload.jti).toBeTruthy();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('throws on tampered token', async () => {
    const token = await signAccessToken('user-1', 'yoigiri', SECRET);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyToken(tampered, SECRET)).rejects.toThrow();
  });

  it('throws on wrong secret', async () => {
    const token = await signAccessToken('user-1', 'yoigiri', SECRET);
    await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow();
  });

  it('refresh token has longer expiry than access token', async () => {
    const access = await signAccessToken('user-1', 'yoigiri', SECRET);
    const refresh = await signRefreshToken('user-1', 'yoigiri', SECRET);
    const ap = await verifyToken(access, SECRET);
    const rp = await verifyToken(refresh, SECRET);
    expect(rp.exp).toBeGreaterThan(ap.exp);
  });
});
