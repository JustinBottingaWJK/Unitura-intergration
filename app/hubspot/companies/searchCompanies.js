const axios = require('axios');
const Sentry = require('@sentry/node');

const searchCompanies = async (relations, limiter, searchLimiter) => {
  const relationCodes = relations.map(relation => relation.code.toString().trim());

  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const remainingSearchTokens = await searchLimiter.removeTokens(1)
  console.log('Remaining search tokens:', remainingSearchTokens)

  console.log(`Searching for companies in HubSpot based on relation codes from Ridder: ${relationCodes.join(', ')}`)
  // Search for company based on Ridder code
  const data = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'ridder_code',
            operator: 'IN',
            values: relationCodes
          },
        ]
      }
    ],
    properties: ['hs_object_id', 'ridder_id', 'ridder_code', 'sync_timestamp', 'name'],
    limit: 100
  }

  return axios({
    method: 'post',
    url: 'https://api.hubapi.com/crm/v3/objects/companies/search',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Succesfully found ${response.data.results.length} companies in HubSpot`)
    return response.data.results
  }).catch((error) => {
    console.log(`Error while searching for companies in HubSpot:`)
    Sentry.captureException(error)
    return false
  })
}

module.exports = {
  searchCompanies
};