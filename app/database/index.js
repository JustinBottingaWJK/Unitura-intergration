const { Pool } = require('pg');
const dns = require('dns');

let pool = null;

const getPool = () => {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL not set, running in memory-only token mode');
    return null;
  }
  // Allow override of DNS servers if provided (comma separated)
  if (process.env.DNS_OVERRIDE_SERVERS) {
    try {
      const servers = process.env.DNS_OVERRIDE_SERVERS.split(',').map(s => s.trim()).filter(Boolean);
      if (servers.length) {
        dns.setServers(servers);
        console.log('[db] DNS servers overridden ->', servers.join(', '));
      }
    } catch (e) {
      console.warn('[db] Failed to set DNS override servers', e.message);
    }
  }

  const baseConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  };
  if (process.env.PG_FORCE_IPV4 === 'true') {
    try {
      baseConfig.lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4, hints: dns.ADDRCONFIG }, callback);
      console.log('[db] Forcing IPv4 DNS lookup');
    } catch (e) {
      console.warn('[db] Could not enable IPv4-only lookup', e.message);
    }
  }

  // Optionally resolve IPv6 AAAA explicitly and connect directly if no A record exists
  if (process.env.PG_USE_IPV6_RESOLVE === 'true') {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const originalHost = url.hostname;
      const port = url.port || '5432';
      // Resolve AAAA record
      dns.resolve6(originalHost, (err, addresses) => {
        if (err || !addresses.length) {
          console.warn('[db] IPv6 resolve failed, continuing with normal connection', err?.code || err?.message);
          // fallback to normal Pool using connectionString
          pool = new Pool(baseConfig);
          return;
        }
        const ipv6 = addresses[0];
        console.log('[db] Using IPv6 resolved address for host', originalHost, '->', ipv6);
        // Build discrete config (avoid connectionString so we can inject literal IPv6 host)
        const user = decodeURIComponent(url.username);
        const password = decodeURIComponent(url.password);
        const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
        const ipv6Config = {
          host: ipv6,
          port: parseInt(port, 10),
          user,
            password,
          database,
          ssl: baseConfig.ssl,
          // supply a custom lookup so pg/tls does not re-resolve the literal IPv6
          lookup: (hostname, _opts, cb) => {
            if (hostname === ipv6) return cb(null, ipv6, 6);
            return dns.lookup(hostname, _opts, cb);
          }
        };
        try {
          pool = new Pool(ipv6Config);
        } catch (e2) {
          console.error('[db] Failed to create IPv6 pool, falling back', e2.message);
          pool = new Pool(baseConfig);
        }
      });
      // Return a temporary placeholder pool-like to satisfy callers until async resolve finishes
      // Subsequent getPool() calls will reuse real pool once set.
      return pool;
    } catch (e) {
      console.warn('[db] PG_USE_IPV6_RESOLVE setup failed', e.message);
    }
  }
  pool = new Pool(baseConfig);
  return pool;
};

const ensureSchema = async () => {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS hubspot_tokens (
      portal_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      scopes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    return true;
  } catch (e) {
    console.error('[db] ensureSchema error', e.message);
    return false; // allow caller to treat as non-fatal and fallback
  }
};

const loadToken = async (portalId = 'default') => {
  const p = getPool();
  if (!p) return null;
  try {
    const { rows } = await p.query('SELECT * FROM hubspot_tokens WHERE portal_id=$1', [portalId]);
    return rows[0] || null;
  } catch (e) {
    console.error('[db] loadToken error', e.message);
    return null;
  }
};

const saveToken = async ({ portal_id = 'default', access_token, refresh_token, expires_at, scopes }) => {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(`INSERT INTO hubspot_tokens (portal_id, access_token, refresh_token, expires_at, scopes, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (portal_id) DO UPDATE SET access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token, expires_at=EXCLUDED.expires_at, scopes=EXCLUDED.scopes, updated_at=NOW()`,
      [portal_id, access_token, refresh_token || null, expires_at ? new Date(expires_at) : null, scopes || null]);
    return true;
  } catch (e) {
    console.error('[db] saveToken error', e.message);
    return false;
  }
};

module.exports = { getPool, ensureSchema, loadToken, saveToken };
