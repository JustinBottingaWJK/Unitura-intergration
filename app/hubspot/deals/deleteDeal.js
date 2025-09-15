const axios = require('axios');
const Sentry = require('@sentry/node');

// Deletes a deal from HubSpot

const deleteDeal = async (dealId, limiter) => {
  console.log(`Deleting deal ${dealId} from HubSpot`);
  
  const remainingTokens = await limiter.removeTokens(1);
  console.log('Remaining tokens:', remainingTokens);
  
  try {
    await axios({
      method: 'delete',
      url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`
      }
    });
    
    console.log(`Successfully deleted deal ${dealId} from HubSpot`);
    return true;
  } catch (error) {
    console.log(`Error while deleting deal ${dealId} from HubSpot:`);
    console.log(error);
    Sentry.captureException(error);
    return false;
  }
};

module.exports = {
  deleteDeal
};