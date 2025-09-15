const axios = require('axios')
const Sentry = require('@sentry/node');

const getOrderById = async (orderId, isProject) => {
  console.log(`Retrieving order with ID ${orderId} from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  try {
    const response = await axios({
      method: 'get',
      url: `${url}/production/orders/${orderId}`,
      headers: {
        'X-API-KEY': apiKey
      }
    });
    
    console.log(`Successfully retrieved order with ID ${orderId} from Ridder`);
    return response.data;
  } catch (error) {
    console.log(`Failed to retrieve order with ID ${orderId} from Ridder`);
    Sentry.captureException(error);
    return null;
  }
}

module.exports = {
  getOrderById
}