const axios = require('axios');
const Sentry = require('@sentry/node');

const associateDealToCompany = async (dealId, companyId, limiter) => {
  console.log(`Associating deal ${dealId} to company ${companyId} in HubSpot`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)
  
  return axios({
    method: 'put',
    url: `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/companies/${companyId}`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify([
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 341
      },
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 5 // Verify with Elles if we should also pass the primary label
      }
    ])
  }).then((response) => {
    console.log(`Successfully associated deal ${dealId} to company ${companyId} in HubSpot`);
    return response.data;
  }).catch((error) => {
    console.log(`Error while associating deal ${dealId} to company ${companyId} in HubSpot`);
    Sentry.captureException(error)
    return null
  })
}

module.exports = {
  associateDealToCompany
}