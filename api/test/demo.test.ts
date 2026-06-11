import { describe, expect, it } from 'vitest';
import app from '../src/index';

const env = {
  FRONTEND_URL: 'http://127.0.0.1:4179',
} as never;

async function api(path: string) {
  return app.fetch(new Request(`http://worker.test${path}`), env);
}

describe('demo api bridge', () => {
  it('returns a frontend bootstrap snapshot', async () => {
    const response = await api('/api/v1/demo/bootstrap');
    expect(response.status).toBe(200);

    const body = await response.json() as {
      viewer: { id: string };
      projects: Array<{ id: string }>;
      characters: Array<{ id: string }>;
      projectCharacterLinks: Array<{ id: string }>;
    };

    expect(body.viewer.id).toBe('user-wen');
    expect(body.projects.some((project) => project.id === 'open-collab')).toBe(true);
    expect(body.characters.some((character) => character.id === 'char-mika')).toBe(true);
    expect(body.projectCharacterLinks.some((link) => link.id === 'link-nozomi-open')).toBe(true);
  });

  it('keeps pending roster items out of the public renderer payload', async () => {
    const response = await api('/api/v1/demo/public-projects/tokoyo-open');
    expect(response.status).toBe(200);

    const body = await response.json() as {
      characters: Array<{ id: string; projectRole: string }>;
    };

    expect(body.characters.some((character) => character.id === 'char-nozomi')).toBe(true);
    expect(body.characters.some((character) => character.id === 'char-tomori')).toBe(false);
    expect(body.characters.every((character) => character.projectRole !== '待審核')).toBe(true);
  });
});
