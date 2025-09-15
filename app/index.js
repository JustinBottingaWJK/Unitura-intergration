
const express = require('express');
const { RateLimiterMemory, RateLimiterQueue } = require('rate-limiter-flexible')
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require('@sentry/profiling-node')
const { CronJob } = require('cron');
// const dotenv = require('dotenv')
// dotenv.config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const bodyParser = require('body-parser');

const { getOffers, checkProjectOffersProperties, checkOffersProperties, fetchAllOffers } = require('./ridder/offers')
const { getOrders, checkProjectOrdersProperties, checkOrdersProperties } = require('./ridder/orders')
const { getContacts } = require('./ridder/contacts')
const { getRelations, getAllRelations } = require('./ridder/relations')
const { handleDeals, findOrphanedDeals, deleteOrphanedDeals, checkDirectOrdersWithZeroAmount } = require('./hubspot/deals')
const { handleContacts } = require('./hubspot/contacts')
const { handleCompanies } = require('./hubspot/companies')

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

Sentry.init({
  dsn: "https://229c6ad7e6cf55fc6ab479d74cf6d7c5@o36959.ingest.us.sentry.io/4507107917824001",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app }),
    nodeProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(bodyParser.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf
    }
  }
}));

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
CronJob.from({
  cronTime: '0 * * * * *', // Run every minute
  runOnInit: true,
  onTick: () => {
    runIntegration();
  },
  start: true,
  timeZone: 'Europe/Amsterdam'
})

// Cron job for cleanup orphaned deals at midnight, deals that are not in Ridder anymore
CronJob.from({ 
  cronTime: '0 0 0 * * *',  // Run at midnight every day
  onTick: () => {
    cleanupOrphanedDeals();
  },
  runOnInit: true,
  start: true,
  timeZone: 'Europe/Amsterdam'
});

// Cron job for checking direct orders with zero amount
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

// app.get('/update-relations', async (req, res) => {
//   const relations = await getAllRelations()
//   await handleCompanies(relations, false, limiter, searchLimiter)
// })

app.get('/', (req, res) => {
  res.send('Hello world!')
})

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.listen(process.env.PORT || 3000, () => {
	console.log(`Unitura Integration listening at http://localhost:${process.env.PORT}`)
})
