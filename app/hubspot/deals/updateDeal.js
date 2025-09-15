const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatDealData } = require('./formatDealData')

const updateDeal = async (deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, docUrl, isProject, limiter) => {
  try {
    console.log(`Trying to update deal with Ridder ID: ${deal.data.id} and HubSpot ID: ${deal.id}`);
    const remainingTokens = await limiter.removeTokens(1);
    console.log('Remaining tokens:', remainingTokens);

    const data = {
      properties: await formatDealData(deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, docUrl, isProject)
    };

    const response = await axios({
      method: 'patch',
      url: `https://api.hubapi.com/crm/v3/objects/deals/${deal.id}`,
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(data)
    });

    console.log(`Successfully updated HubSpot deal: ${response.data.id} based on Ridder offer: ${deal.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error(`Failed to update HubSpot deal ${deal.id} with Ridder ID: ${deal.data.id}`);
    console.error('Error details:', error.response?.data || error.message || error);
    Sentry.captureException(error);
    return null;
  }
};

module.exports = {
  updateDeal
}