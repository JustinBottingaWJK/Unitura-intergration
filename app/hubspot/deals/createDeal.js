const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatDealData } = require('./formatDealData')

const createDeal = async (deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, companyToAssociate, contactToAssociate, docUrl, isProject, limiter) => {
  console.log(`Trying to create deal with Ridder ID: ${deal.data.id}`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const data = {
    properties: await formatDealData(deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, docUrl, isProject),
    associations: []
  }

  if (companyToAssociate) {
    data.associations.push({
      to: {
        id: companyToAssociate
      },
      types: [
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341
        },
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 5 // Verify with Elles if we should also pass the primary label
        }
      ]
    })
  }

  if (contactToAssociate) {
    data.associations.push({
      to: {
        id: contactToAssociate
      },
      types: [
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3
        }
      ]
    })
  }

  return axios({
    method: 'post',
    url: `https://api.hubapi.com/crm/v3/objects/deals`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully created HubSpot deal: ${response.data.id} based on Ridder offer: ${deal.data.id}`)
    return response.data.id
  }).catch(async(error) => {
    console.log(`Failed to create HubSpot deal with Ridder ID: ${deal.data.id}`)
    console.error('Error details:', error.response?.data || error.message || error);
    Sentry.captureException(error);

    return null
  })
}

module.exports = {
  createDeal
}