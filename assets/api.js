/* CharacterHub API client — loaded on every page */
(function () {
  const API = 'https://oc-tools-api.beibeiz.workers.dev/api/v1';
  let _token = null;

  // ── token management ──────────────────────────────────────────────────────

  async function refreshToken() {
    try {
      const r = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!r.ok) return null;
      const d = await r.json();
      _token = d.access_token;
      return _token;
    } catch { return null; }
  }

  async function getToken() {
    return _token || await refreshToken();
  }

  function checkFragmentToken() {
    const hash = location.hash;
    if (!hash.includes('token=')) return null;
    const token = new URLSearchParams(hash.slice(1)).get('token');
    if (!token) return null;
    _token = token;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return token;
  }

  async function requireAuth(loginPath) {
    // Check if OAuth just redirected here with a token in the fragment
    checkFragmentToken();
    const t = await getToken();
    if (!t) {
      location.href = loginPath || 'login.html';
      return null;
    }
    return t;
  }

  // ── base fetch ────────────────────────────────────────────────────────────

  async function apiFetch(path, opts = {}) {
    const token = await getToken();
    const isFormData = opts.body instanceof FormData;
    const headers = { ...opts.headers };
    if (!isFormData) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const r = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });
    if (r.status === 401) { _token = null; location.href = 'login.html'; return null; }
    return r;
  }

  // ── auth ──────────────────────────────────────────────────────────────────

  async function login(email, password) {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || '登入失敗');
    _token = d.access_token;
    return d;
  }

  async function register(email, username, password, display_name) {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, display_name }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || '註冊失敗');
    _token = d.access_token;
    return d;
  }

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    _token = null;
  }

  function loginWithGoogle() { location.href = `${API}/auth/google`; }
  function loginWithGitHub()  { location.href = `${API}/auth/github`; }

  // ── OCs ───────────────────────────────────────────────────────────────────

  async function listOCs(projectId) {
    const q = projectId ? `?project=${encodeURIComponent(projectId)}` : '';
    const r = await apiFetch(`/ocs${q}`);
    if (!r || !r.ok) return [];
    return r.json();
  }

  async function getOC(id) {
    const r = await apiFetch(`/ocs/${id}`);
    if (!r || !r.ok) return null;
    return r.json();
  }

  async function createOC(data) {
    const r = await apiFetch('/ocs', { method: 'POST', body: JSON.stringify(data) });
    if (!r) return null;
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'OC 建立失敗');
    return d;
  }

  async function updateOC(id, data) {
    const r = await apiFetch(`/ocs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    if (!r) return null;
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'OC 更新失敗');
    return d;
  }

  async function deleteOC(id) {
    const r = await apiFetch(`/ocs/${id}`, { method: 'DELETE' });
    return r && r.ok;
  }

  // ── projects ──────────────────────────────────────────────────────────────

  async function listProjects() {
    const r = await apiFetch('/projects');
    if (!r || !r.ok) return [];
    return r.json();
  }

  async function createProject(data) {
    const r = await apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) });
    if (!r) return null;
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || '企劃建立失敗');
    return d;
  }

  async function deleteProject(id) {
    const r = await apiFetch(`/projects/${id}`, { method: 'DELETE' });
    return r && r.ok;
  }

  // ── user ──────────────────────────────────────────────────────────────────

  async function getMe() {
    const r = await apiFetch('/users/me');
    if (!r || !r.ok) return null;
    return r.json();
  }

  async function updateMe(data) {
    const r = await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
    if (!r) return null;
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || '更新失敗');
    return d;
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  function parseJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() / 1000) - ts);
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return `${Math.floor(diff / 604800)} 週前`;
  }

  const PRIV_LABEL = { public: '公開', unlisted: '限連結', password: '密碼', private: '草稿' };

  // ── export ────────────────────────────────────────────────────────────────

  window.CharHub = {
    getToken, requireAuth, checkFragmentToken,
    login, register, logout, loginWithGoogle, loginWithGitHub,
    listOCs, getOC, createOC, updateOC, deleteOC,
    listProjects, createProject, deleteProject,
    getMe, updateMe,
    parseJSON, timeAgo, PRIV_LABEL,
  };
})();
