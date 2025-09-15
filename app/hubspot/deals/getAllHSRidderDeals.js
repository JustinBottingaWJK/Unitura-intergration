const axios = require('axios');
const Sentry = require('@sentry/node');

// Gets all active deals from HubSpot that were synced from Ridder

const getAllHSRidderDeals = async (limiter, searchLimiter) => {
  console.log('Getting all Ridder deals from HubSpot');
  
  const allDeals = [];
  let after = undefined;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const remainingTokens = await limiter.removeTokens(1);
    console.log('Remaining tokens:', remainingTokens);
    
    const remainingSearchTokens = await searchLimiter.removeTokens(1);
    console.log('Remaining search tokens:', remainingSearchTokens);
    
    // We'll search for deals that have a ridder_id property
    const data = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'ridder_id',
              operator: 'HAS_PROPERTY'
            }        
          ]
        }
      ],
      properties: [
        'hs_object_id', 
        'ridder_id', 
        'dealname', 
        'description', 
        'dealstage', 
        'pipeline',
        'offer_number',
        'createdate',
      ],
      limit: limit,
      after: after
    };
    
    try {
      const response = await axios({
        method: 'post',
        url: 'https://api.hubapi.com/crm/v3/objects/deals/search',
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(data)
      });
      
      const deals = response.data.results;
      console.log(`Successfully found ${deals.length} Ridder deals in HubSpot (page)`);
      
      allDeals.push(...deals);
      
      // Check if there are more deals to fetch
      if (response.data.paging && response.data.paging.next && response.data.paging.next.after) {
        after = response.data.paging.next.after;
        console.log(`Retrieved ${allDeals.length} deals so far, fetching next page...`);
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.log('Error while searching for Ridder deals in HubSpot:');
      console.log(error);
      Sentry.captureException(error);
      hasMore = false;
    }
  }
  
  console.log(`Total Ridder deals found in HubSpot: ${allDeals.length}`);


  return allDeals;
};

module.exports = {
  getAllHSRidderDeals
};