import { describe, expect, it } from 'vitest';
import app from '../src/index';

const env = {
  FRONTEND_URL: 'https://example.test',
} as never;

describe('app api auth guard', () => {
  it('rejects demo auth headers outside local/demo environments', async () => {
    const response = await app.fetch(new Request('https://api.example.test/api/app/projects', {
      headers: { 'X-Demo-User-Id': 'demo-user' },
    }), env);

    expect(response.status).toBe(403);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe('DEMO_AUTH_DISABLED');
  });

  it('requires a production session outside local/demo environments', async () => {
    const response = await app.fetch(new Request('https://api.example.test/api/app/projects'), env);

    expect(response.status).toBe(401);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
