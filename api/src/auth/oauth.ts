export async function getGoogleAuthUrl(clientId: string, redirectUri: string, state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw new Error('Google token exchange failed');
  return res.json() as Promise<{ access_token: string; id_token: string }>;
}

export async function getGoogleUser(accessToken: string): Promise<{ id: string; email: string; name: string; picture: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user');
  return res.json() as Promise<{ id: string; email: string; name: string; picture: string }>;
}

export async function getGitHubAuthUrl(clientId: string, state: string): Promise<string> {
  const params = new URLSearchParams({ client_id: clientId, scope: 'user:email', state });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(code: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error('GitHub token exchange failed');
  return res.json() as Promise<{ access_token: string }>;
}

export async function getGitHubUser(accessToken: string): Promise<{ id: number; login: string; name: string; avatar_url: string; email: string | null }> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'CharacterHub' },
  });
  if (!res.ok) throw new Error('Failed to fetch GitHub user');
  return res.json() as Promise<{ id: number; login: string; name: string; avatar_url: string; email: string | null }>;
}

export async function getGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'CharacterHub' },
  });
  if (!res.ok) return null;
  const emails = await res.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
  return emails.find(e => e.primary && e.verified)?.email ?? null;
}
