const axios = require('axios');
const Sentry = require('@sentry/node');

const searchDeals = async (records, limiter, searchLimiter, isProject, isOrderSource = false) => {
  // Create array of IDs to search for
  const recordIds = [];
  
  records.forEach(record => {
    const baseId = isProject ? `project-${record.id.toString()}` : record.id.toString();
    
    // If the records come from the orders endpoint, use the -order suffix
    if (isOrderSource) {
      recordIds.push(`${baseId}-order`);
    } else {
      // If the records come from the offers endpoint, use the base ID
      recordIds.push(baseId);
    }
  });

  console.log(`Searching for deals in HubSpot based on ${isOrderSource ? 'order' : 'offer'} ID's from Ridder`)
  // console.log('IDs to search:', recordIds);

  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const remainingSearchTokens = await searchLimiter.removeTokens(1)
  console.log('Remaining search tokens:', remainingSearchTokens)

  const data = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'ridder_id',
            operator: 'IN',
            values: recordIds
          }
        ]
      }
    ],
    properties: ['hs_object_id', 'ridder_id', 'sync_timestamp', 'dealname', 'dealstage'],
    limit: 100
  }

  return axios({
    method: 'post',
    url: 'https://api.hubapi.com/crm/v3/objects/deals/search',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Succesfully found ${response.data.results.length} deals in HubSpot`)
    return response.data.results
  }).catch((error) => {
    console.log(`Error while searching for deals in HubSpot:`)
    console.log(error)
    Sentry.captureException(error);
    return false
  })
}

module.exports = {
  searchDeals
};