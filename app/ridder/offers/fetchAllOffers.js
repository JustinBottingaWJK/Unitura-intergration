const axios = require('axios');
const Sentry = require('@sentry/node');

// Cleanup process to find orphaned deals

const fetchAllOffers = async (isProject) => {
  console.log(`Retrieving all offers from Ridder for cleanup process.`);
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST;
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY;

  const offers = [];
  let needToRetrieveMore = true;
  let page = 1;
  const size = 200;
  
  while (needToRetrieveMore) {
    const config = {
      method: 'get',
      url: `${url}/sales/salesoffers`,
      headers: { 'X-API-KEY': apiKey },
      params: {
        size,
        page,
        // filter: `(datechanged[gte]"2024-06-01T00:00:00.000Z") and (datechanged[lte]"2024-07-01T00:00:00.000Z")`,
      }
    };
  
    try {
      const response = await axios(config);
      console.log(`Successfully retrieved ${response.data.length} offers from Ridder`);
      offers.push(...response.data);
  
      if (response.data.length === size) {
        console.log(`Retrieved ${offers.length} offers in total, retrieving next ${size}`);
      } else {
        needToRetrieveMore = false;
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Failed to retrieve offers from Ridder: ${error.message}`);
      needToRetrieveMore = false;
    }
    page++;
  }

  return offers;
};

module.exports = {
  fetchAllOffers
};