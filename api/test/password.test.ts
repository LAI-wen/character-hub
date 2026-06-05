import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';

describe('password', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toContain(':');
    expect(await verifyPassword('secret123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same input', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});
