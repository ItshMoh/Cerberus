/**
 * Frontend API client — all calls to the backend go through here.
 */

const BASE = '';

function headers(sessionToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) h['x-session-token'] = sessionToken;
  return h;
}

// ── Auth ────────────────────────────────────────────────────────────────

export async function authConnect(accountId: string, privateKey: string) {
  const res = await fetch(`${BASE}/api/auth/connect`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ accountId, privateKey }),
  });
  return res.json();
}

export async function authDisconnect(sessionToken: string) {
  const res = await fetch(`${BASE}/api/auth/disconnect`, {
    method: 'POST',
    headers: headers(sessionToken),
  });
  return res.json();
}

export async function authStatus(sessionToken?: string | null) {
  const res = await fetch(`${BASE}/api/auth/status`, {
    headers: headers(sessionToken),
  });
  return res.json();
}

// ── Strategy ────────────────────────────────────────────────────────────

export async function getStrategies(sessionToken: string) {
  const res = await fetch(`${BASE}/api/strategy`, {
    headers: headers(sessionToken),
  });
  return res.json();
}

export async function saveStrategy(sessionToken: string, config: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/strategy`, {
    method: 'POST',
    headers: headers(sessionToken),
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function updateStrategy(sessionToken: string, id: string, config: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/strategy`, {
    method: 'PUT',
    headers: headers(sessionToken),
    body: JSON.stringify({ id, ...config }),
  });
  return res.json();
}

export async function deleteStrategy(sessionToken: string, id: string) {
  const res = await fetch(`${BASE}/api/strategy?id=${id}`, {
    method: 'DELETE',
    headers: headers(sessionToken),
  });
  return res.json();
}

// ── Keeper ──────────────────────────────────────────────────────────────

export async function keeperStart(sessionToken: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE}/api/keeper/start`, {
    method: 'POST',
    headers: headers(sessionToken),
    body: JSON.stringify(opts),
  });
  return res.json();
}

export async function keeperStop(sessionToken: string) {
  const res = await fetch(`${BASE}/api/keeper/stop`, {
    method: 'POST',
    headers: headers(sessionToken),
  });
  return res.json();
}

export async function keeperStatus(sessionToken?: string | null) {
  const res = await fetch(`${BASE}/api/keeper/start`, {
    headers: headers(sessionToken),
  });
  return res.json();
}

// ── Audit Log ───────────────────────────────────────────────────────────

export async function getAuditLogs(params: { limit?: number; vault?: string; action?: string } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.vault) q.set('vault', params.vault);
  if (params.action) q.set('action', params.action);
  const res = await fetch(`${BASE}/api/audit-log?${q.toString()}`);
  return res.json();
}

// ── Vault / Health ──────────────────────────────────────────────────────

export async function getVaultTest() {
  const res = await fetch(`${BASE}/api/vault-test`);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${BASE}/api/health`);
  return res.json();
}

// ── Keeper one-shot checks ──────────────────────────────────────────────

export async function rebalanceCheck(sessionToken?: string | null) {
  const res = await fetch(`${BASE}/api/keeper/rebalance`, {
    headers: headers(sessionToken),
  });
  return res.json();
}

export async function depegCheck(sessionToken?: string | null) {
  const res = await fetch(`${BASE}/api/keeper/depeg-check`, {
    headers: headers(sessionToken),
  });
  return res.json();
}

export async function harvestCheck(sessionToken?: string | null, token = 'SAUCE') {
  const res = await fetch(`${BASE}/api/keeper/harvest?token=${token}`, {
    headers: headers(sessionToken),
  });
  return res.json();
}
