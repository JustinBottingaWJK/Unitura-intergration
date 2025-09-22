
const express = require('express');
const { RateLimiterMemory, RateLimiterQueue } = require('rate-limiter-flexible')
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require('@sentry/profiling-node')
const { CronJob } = require('cron');
const axios = require('axios');
require('dotenv').config(); // load root .env

const app = express();
const bodyParser = require('body-parser');

const { getOffers, checkProjectOffersProperties, checkOffersProperties, fetchAllOffers } = require('./ridder/offers')
const { getOrders, checkProjectOrdersProperties, checkOrdersProperties } = require('./ridder/orders')
const { getContacts } = require('./ridder/contacts')
const { getRelations, getAllRelations } = require('./ridder/relations')
const { handleDeals, findOrphanedDeals, deleteOrphanedDeals, checkDirectOrdersWithZeroAmount } = require('./hubspot/deals')
const { handleContacts } = require('./hubspot/contacts')
const { handleCompanies } = require('./hubspot/companies')
const { ensureSchema, loadToken, saveToken } = require('./database')

// HubSpot has an API limit of 100 requests per 10 seconds, set a limiter to prevent exceeding these limits, reduce it with the amount of search requests
const APILimits = {
  points: 90, // Requests
  duration: 10, // Seconds
}

// HubSpot search endpoints have an API limit of 4 requests per 1 seconds, set a limiter to prevent exceeding these limits
const searchLimits = {
  points: 3,
  duration: 1
}

const rateLimiter = new RateLimiterMemory(APILimits)
const searchRateLimiter = new RateLimiterMemory(searchLimits)

const limiter = new RateLimiterQueue(rateLimiter)
const searchLimiter = new RateLimiterQueue(searchRateLimiter)

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

if (process.env.SENTRY_DSN) {
  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(bodyParser.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf
    }
  }
}));

// ==================== OAUTH TOKEN HANDLING ====================
let hubspotTokens = {
  portalId: 'default',
  accessToken: process.env.HUBSPOT_TOKEN || null,
  refreshToken: null,
  expiresAt: null,
  scopes: null
}

// Initialize DB token (if any) on startup
; (async () => { // leading semicolon protects against ASI calling previous expression
  try {
    const schemaReady = await ensureSchema();
    if (schemaReady) {
      const existing = await loadToken('default');
      if (existing) {
        hubspotTokens.portalId = existing.portal_id;
        hubspotTokens.accessToken = existing.access_token;
        hubspotTokens.refreshToken = existing.refresh_token;
        hubspotTokens.expiresAt = existing.expires_at ? new Date(existing.expires_at).getTime() : null;
        hubspotTokens.scopes = existing.scopes;
        console.log('[oauth] Loaded token from DB for portal', existing.portal_id);
      } else {
        console.log('[oauth] No existing token row found in DB');
      }
    } else {
      console.warn('[oauth] DB schema not ready, continuing in memory-only mode');
    }
  } catch (e) {
    console.error('[oauth] Startup token load failed, memory-only mode active:', e.message);
  }
})();

// Periodically retry DB availability and persist token if previously memory-only
setInterval(async () => {
  try {
    // Only act if we have an access token in memory and either no DB schema yet or token row missing
    const schemaReady = await ensureSchema();
    if (!schemaReady) return; // still unreachable
    const existing = await loadToken(hubspotTokens.portalId || 'default');
    if (!existing && hubspotTokens.accessToken) {
      await saveToken({
        portal_id: hubspotTokens.portalId || 'default',
        access_token: hubspotTokens.accessToken,
        refresh_token: hubspotTokens.refreshToken,
        expires_at: hubspotTokens.expiresAt ? new Date(hubspotTokens.expiresAt) : null,
        scopes: hubspotTokens.scopes || (process.env.HUBSPOT_SCOPES || '')
      });
      console.log('[oauth] Backfilled in-memory token to DB after reconnect');
    }
  } catch (e) {
    // silent-ish; log once every few failures could be added later
  }
}, 30_000); // every 30s

const getAccessToken = async () => {
  if (!hubspotTokens.accessToken && process.env.HUBSPOT_TOKEN) return process.env.HUBSPOT_TOKEN;
  if (!hubspotTokens.accessToken) throw new Error('No HubSpot access token available. Visit /install to authorize.');
  if (hubspotTokens.expiresAt && Date.now() > hubspotTokens.expiresAt - 60_000 && hubspotTokens.refreshToken) {
    await refreshAccessToken();
  }
  return hubspotTokens.accessToken;
}

const refreshAccessToken = async () => {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: hubspotTokens.refreshToken
    });
    const resp = await axios.post('https://api.hubapi.com/oauth/v1/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    hubspotTokens.accessToken = resp.data.access_token;
    hubspotTokens.expiresAt = Date.now() + (resp.data.expires_in * 1000);
    if (resp.data.refresh_token) hubspotTokens.refreshToken = resp.data.refresh_token;
    await saveToken({
      portal_id: hubspotTokens.portalId || 'default',
      access_token: hubspotTokens.accessToken,
      refresh_token: hubspotTokens.refreshToken,
      expires_at: new Date(hubspotTokens.expiresAt),
      scopes: hubspotTokens.scopes || (process.env.HUBSPOT_SCOPES || '')
    });
    console.log('Refreshed HubSpot access token and persisted');
  } catch (err) {
    console.error('Failed to refresh HubSpot token', err.response?.data || err.message);
    Sentry.captureException?.(err);
    throw err;
  }
}

app.get('/install', (req, res) => {
  try {
    const scopes = process.env.HUBSPOT_SCOPES || 'oauth';
    const redirectUri = encodeURIComponent(process.env.REDIRECT_URI || 'http://localhost:3000/oauth/callback');
    const authUrl = `https://app-eu1.hubspot.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(scopes)}`;
    return res.redirect(authUrl);
  } catch (e) {
    console.error('/install error', e);
    return res.status(500).json({ error: 'Failed to start OAuth install' });
  }
});

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      code
    });
    const resp = await axios.post('https://api.hubapi.com/oauth/v1/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    hubspotTokens.accessToken = resp.data.access_token;
    hubspotTokens.refreshToken = resp.data.refresh_token;
    hubspotTokens.expiresAt = Date.now() + (resp.data.expires_in * 1000);
    hubspotTokens.scopes = (process.env.HUBSPOT_SCOPES || '').trim();

    // Attempt hub info lookup for portal id
    try {
      const hubInfo = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${hubspotTokens.accessToken}`);
      if (hubInfo.data && hubInfo.data.hub_id) {
        hubspotTokens.portalId = String(hubInfo.data.hub_id);
      }
    } catch (e) {
      console.warn('Could not retrieve hub info, using default portal id:', e.response?.data || e.message);
    }

    await saveToken({
      portal_id: hubspotTokens.portalId,
      access_token: hubspotTokens.accessToken,
      refresh_token: hubspotTokens.refreshToken,
      expires_at: new Date(hubspotTokens.expiresAt),
      scopes: hubspotTokens.scopes
    });
    console.log('OAuth success. Token stored for portal', hubspotTokens.portalId);
    return res.send(`Authorization successful. Portal ${hubspotTokens.portalId}. Token persisted.`);
  } catch (err) {
    console.error('OAuth callback error', err.response?.data || err.message);
    Sentry.captureException?.(err);
    return res.status(500).send('OAuth exchange failed');
  }
});

app.get('/debug/token', (req, res) => {
  if (!hubspotTokens.accessToken) return res.json({ hasAccessToken: false });
  res.json({
    hasAccessToken: true,
    expiresAt: hubspotTokens.expiresAt,
    willRefreshInMs: hubspotTokens.expiresAt ? (hubspotTokens.expiresAt - Date.now()) : null
  });
});

// Limited DB token inspection (no raw token leakage)
app.get('/debug/db', async (req, res) => {
  try {
    const row = await loadToken(hubspotTokens.portalId || 'default');
    if (!row) return res.json({ inDb: false });
    return res.json({
      inDb: true,
      portal_id: row.portal_id,
      has_access_token: !!row.access_token,
      expires_at: row.expires_at,
      scopes: row.scopes
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Simple DB health check
app.get('/health/db', async (req, res) => {
  try {
    const start = Date.now();
    const p = require('./database').getPool();
    if (!p) return res.status(200).json({ ok: false, reason: 'pool-not-initialized (memory-mode)', latencyMs: 0 });
    const r = await p.query('SELECT 1 as ok');
    return res.json({ ok: true, result: r.rows[0].ok, latencyMs: Date.now() - start });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// DNS diagnostics for DB host
app.get('/debug/dns', async (req, res) => {
  const dns = require('dns');
  const host = (process.env.DATABASE_URL || '').match(/@([^/:]+)(?::\d+)?\//)?.[1];
  if (!host) return res.json({ error: 'No host parsed from DATABASE_URL' });
  const servers = dns.getServers();
  const result = { host, servers, lookups: {} };
  const families = [4, 6];
  await Promise.all(families.map(f => new Promise(resolve => {
    dns.lookup(host, { family: f }, (err, address, family) => {
      result.lookups['ipv' + f] = err ? { error: err.code || err.message } : { address, family };
      resolve();
    });
  })));
  // Resolve A/AAAA specifically
  await Promise.all(['resolve4','resolve6'].map(m => new Promise(resolve => {
    dns[m](host, (err, addresses) => {
      result[m] = err ? { error: err.code || err.message } : addresses;
      resolve();
    });
  })));
  return res.json(result);
});

// Alternate postgres client test (pooler experimentation)
app.get('/debug/pg2', async (req, res) => {
  try {
    const { testConnection } = require('./database/db_postgres_client');
    const r = await testConnection();
    return res.status(r.ok ? 200 : 500).json(r);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ==================== ORIGINAL SYNC LOGIC ====================
const runIntegration = async () => {
  console.log('Running sync every minute, retrieving updated offers, contacts and companies from Ridder Unitura Projects')
  const projectOffers = await getOffers(true)
  const projectOrders = await getOrders(true)
  await checkProjectOffersProperties(projectOffers, limiter);
  await checkProjectOrdersProperties(projectOrders, limiter);
  await handleDeals(projectOffers, projectOrders, true, limiter, searchLimiter)

  const projectContacts = await getContacts(true)
  await handleContacts(projectContacts, true, limiter, searchLimiter)

  const projectRelations = await getRelations(true)
  await handleCompanies(projectRelations, true, limiter, searchLimiter)

  // non-project data

  console.log('Running sync every minute, retrieving updated offers, contacts and companies from Ridder Unitura')
  const offers = await getOffers()
  const orders = await getOrders()
  await checkOffersProperties(offers, limiter);
  await checkOrdersProperties(orders, limiter);
  await handleDeals(offers, orders, false, limiter, searchLimiter)

  const contacts = await getContacts()
  await handleContacts(contacts, false, limiter, searchLimiter)

  const relations = await getRelations()
  await handleCompanies(relations, false, limiter, searchLimiter)

  console.log('Finished CRON Job')
}

// Cleanup orphaned deals
const cleanupOrphanedDeals = async () => {
  console.log('Starting cleanup of orphaned deals...');
  
  try {
    // Get all offers from Ridder Products
    console.log('Fetching all offers from Ridder Products...');
    const allOffers = await fetchAllOffers(false);
    console.log(`Retrieved ${allOffers.length} offers from Ridder Products`);

    // Find orphaned deals in HubSpot for products
    console.log('Finding orphaned product deals in HubSpot...');
    const orphanedDeals = await findOrphanedDeals(allOffers, false, limiter, searchLimiter);
    
    // Delete orphaned deals
    if (orphanedDeals.length > 0) {
      console.log(`Found ${orphanedDeals.length} orphaned product deals to delete`);
      await deleteOrphanedDeals(orphanedDeals, limiter);
    } else {
      console.log('No orphaned product deals found');
    }
    
    // Repeat for project offers
    console.log('Fetching all offers from Ridder Projects...');
    const allProjectOffers = await fetchAllOffers(true);
    console.log(`Retrieved ${allProjectOffers.length} offers from Ridder Projects`);

    // Find orphaned project deals in HubSpot
    console.log('Finding orphaned project deals in HubSpot...');
    const orphanedProjectDeals = await findOrphanedDeals(allProjectOffers, true, limiter, searchLimiter);
    
    // Delete orphaned project deals
    if (orphanedProjectDeals.length > 0) {
      console.log(`Found ${orphanedProjectDeals.length} orphaned project deals to delete`);
      await deleteOrphanedDeals(orphanedProjectDeals, limiter);
    } else {
      console.log('No orphaned project deals found');
    }
    
    console.log('Cleanup of orphaned deals completed');
  } catch (error) {
    console.error('Error during cleanup of orphaned deals:', error);
    Sentry.captureException(error);
  }
};

// Cron job that runs every minute from Ridder to HubSpot
if (process.env.ENABLE_CRON === 'true') {
  CronJob.from({
    cronTime: '0 * * * * *', // Run every minute
    runOnInit: true,
    onTick: () => {
      runIntegration();
    },
    start: true,
    timeZone: 'Europe/Amsterdam'
  })
}

// Cron job for cleanup orphaned deals at midnight, deals that are not in Ridder anymore
if (process.env.ENABLE_CRON === 'true') {
  CronJob.from({ 
    cronTime: '0 0 0 * * *',  // Run at midnight every day
    onTick: () => {
      cleanupOrphanedDeals();
    },
    runOnInit: true,
    start: true,
    timeZone: 'Europe/Amsterdam'
  });
}

// Cron job for checking direct orders with zero amount
if (process.env.ENABLE_CRON === 'true') {
  CronJob.from({
    cronTime: '0 0 2 * * *',  // Run at 2:00 AM every day
    onTick: async () => {
      console.log('Starting daily check for direct orders with zero amount...');
      try {
        const updatedCount = await checkDirectOrdersWithZeroAmount(limiter, searchLimiter);
        console.log(`Direct orders check completed: ${updatedCount} deals with zero amount were deleted`);
      } catch (error) {
        console.error('Error during direct orders check:', error);
        Sentry.captureException(error);
      }
    },
    runOnInit: true,
    start: true,
    timeZone: 'Europe/Amsterdam'
  });
}

// app.get('/update-relations', async (req, res) => {
//   const relations = await getAllRelations()
//   await handleCompanies(relations, false, limiter, searchLimiter)
// })

app.get('/', (req, res) => {
  res.send('Hello world!')
})

// Manual sync trigger (development only)
app.post('/run-sync', async (req, res) => {
  const started = Date.now();
  try {
    await runIntegration();
    return res.json({
      ok: true,
      durationMs: Date.now() - started
    });
  } catch (e) {
    console.error('Manual /run-sync failed', e);
    Sentry.captureException?.(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// The error handler must be registered before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.listen(process.env.PORT || 3000, () => {
	console.log(`Unitura Integration listening at http://localhost:${process.env.PORT}`)
})
