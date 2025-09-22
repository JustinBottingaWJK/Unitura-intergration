// Lightweight alternative client using 'postgres' package for experimentation with pooler / IPv4 endpoints.
// This does not replace the existing pg Pool logic yet; it's opt-in.

const postgres = require('postgres');

let sql = null;

function getSql() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[db-postgres] DATABASE_URL not set');
    return null;
  }
  try {
    sql = postgres(url, {
      ssl: { rejectUnauthorized: false },
      max: process.env.PG_CLIENT_MAX ? parseInt(process.env.PG_CLIENT_MAX, 10) : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return sql;
  } catch (e) {
    console.error('[db-postgres] init error', e.message);
    return null;
  }
}

async function testConnection() {
  const c = getSql();
  if (!c) return { ok: false, error: 'no-sql-instance' };
  try {
    const rows = await c`select 1 as ok`;
    return { ok: true, result: rows[0].ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { getSql, testConnection };
