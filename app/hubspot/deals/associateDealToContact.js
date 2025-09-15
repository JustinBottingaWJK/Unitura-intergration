const axios = require('axios');
const Sentry = require('@sentry/node');

const associateDealToContact = async (dealId, contactId, limiter) => {
  console.log(`Associating deal ${dealId} to contact ${contactId} in HubSpot`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)
  
  return axios({
    method: 'put',
    url: `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify([
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 3
      }
    ])
  }).then((response) => {
    console.log(`Successfully associated deal ${dealId} to contact ${contactId} in HubSpot`);
    return response.data;
  }).catch((error) => {
    console.log(`Error while associating deal ${dealId} to contact ${contactId} in HubSpot`);
    Sentry.captureException(error);
    return null
  })
}

module.exports = {
  associateDealToContact
}