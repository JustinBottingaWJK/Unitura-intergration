const axios = require('axios');
const Sentry = require('@sentry/node');

const getDeal = async (dealId, limiter) => {
  try {
    console.log(`Trying to retrieve deal ${dealId} from HubSpot`);
    const remainingTokens = await limiter.removeTokens(1);
    console.log('Remaining tokens:', remainingTokens);

    const response = await axios({
      method: 'get',
      url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?associations=contacts&associations=companies`,
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Successfully retrieved deal ${dealId} from HubSpot`);
    return response.data;
  } catch (error) {
    console.error(`Failed to retrieve deal ${dealId} from HubSpot`);
    Sentry.captureException(error);
    return null;
  }
};

module.exports = {
  getDeal
}