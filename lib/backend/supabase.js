/**
 * MacroForge — Supabase Backend Client
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY. Never import this from frontend code.
 *
 * Uses the Supabase REST API directly via fetch().
 * No package installation required. No bundle impact on frontend.
 *
 * Security:
 *   SUPABASE_URL            — safe to know (public project URL)
 *   SUPABASE_SERVICE_ROLE_KEY — PRIVATE. Vercel env vars only. Never Git. Never logs.
 *
 * This client uses the service role key which bypasses ALL RLS policies.
 * That's intentional — backend automation must operate on any customer data.
 * The service role is NEVER exposed to the frontend.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail closed — if env vars are missing, throw immediately
// This prevents silent data corruption from undefined credentials
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    '[MacroForge Backend] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. ' +
    'Set them in Vercel project environment variables. NEVER commit them to Git.'
  );
}

const BASE_HEADERS = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
};

// ── PostgREST query builder ───────────────────────────────────────

class QueryBuilder {
  constructor(table) {
    this._table   = table;
    this._params  = {};
    this._headers = {};
    this._method  = 'GET';
    this._body    = null;
  }

  // Filters
  eq(col, val)   { this._params[col] = `eq.${val}`;   return this; }
  neq(col, val)  { this._params[col] = `neq.${val}`;  return this; }
  lt(col, val)   { this._params[col] = `lt.${val}`;   return this; }
  lte(col, val)  { this._params[col] = `lte.${val}`;  return this; }
  gt(col, val)   { this._params[col] = `gt.${val}`;   return this; }
  gte(col, val)  { this._params[col] = `gte.${val}`;  return this; }
  is(col, val)   { this._params[col] = `is.${val}`;   return this; }
  in(col, vals)  { this._params[col] = `in.(${vals.join(',')})`;  return this; }
  like(col, pat) { this._params[col] = `like.${pat}`; return this; }

  // Modifiers
  order(col, { ascending = true } = {}) {
    this._params.order = `${col}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }
  limit(n)   { this._params.limit  = n; return this; }
  offset(n)  { this._params.offset = n; return this; }
  single()   {
    this._headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  // Execution methods
  async select(cols = '*') {
    this._params.select = cols;
    return this._execute();
  }

  async insert(data) {
    this._method  = 'POST';
    this._body    = Array.isArray(data) ? data : [data];
    this._headers['Prefer'] = 'return=representation';
    return this._execute();
  }

  async update(data) {
    this._method  = 'PATCH';
    this._body    = data;
    this._headers['Prefer'] = 'return=representation';
    return this._execute();
  }

  async upsert(data, { onConflict } = {}) {
    this._method  = 'POST';
    this._body    = Array.isArray(data) ? data : [data];
    this._headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    if (onConflict) this._params.on_conflict = onConflict;
    return this._execute();
  }

  async delete() {
    this._method  = 'DELETE';
    this._headers['Prefer'] = 'return=representation';
    return this._execute();
  }

  async _execute() {
    const url   = buildUrl(`${SUPABASE_URL}/rest/v1/${this._table}`, this._params);
    const res   = await fetch(url, {
      method:  this._method,
      headers: { ...BASE_HEADERS, ...this._headers },
      body:    this._body ? JSON.stringify(this._body) : undefined,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data   = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      throw new SupabaseError(res.status, data?.message || data || 'Unknown error', data);
    }

    return { data, status: res.status, ok: true };
  }
}

// ── RPC (stored procedures) ───────────────────────────────────────
async function rpc(fnName, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method:  'POST',
    headers: BASE_HEADERS,
    body:    JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new SupabaseError(res.status, data?.message || 'RPC failed', data);
  return { data, status: res.status, ok: true };
}

// ── Error class ───────────────────────────────────────────────────
class SupabaseError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name    = 'SupabaseError';
    this.status  = status;
    this.details = details;
  }
}

// ── URL builder ───────────────────────────────────────────────────
function buildUrl(base, params) {
  const entries = Object.entries(params);
  if (entries.length === 0) return base;
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${base}?${qs}`;
}

// ── Public API ────────────────────────────────────────────────────
export const supabase = {
  from: (table) => new QueryBuilder(table),
  rpc,
};

export { SupabaseError };
