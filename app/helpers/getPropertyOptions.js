const axios = require('axios');
const Sentry = require('@sentry/node');

const getPropertyOptions = async (object, property) => {
  console.log(`Retrieving options for the ${object} property ${property}`);
  return await axios({
    method: "get",
    url: `https://api.hubapi.com/crm/v3/properties/${object}/${property}?archived=false`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  }).then((response) => {
    if (response.data.options) {
      console.log(
        `Successfully retrieved ${response.data.options.length} options for the ${object} property ${property}`
      );
      return response.data.options
    } else {
      console.log(`The ${object} property ${property} has no options.`);
      return false
    }
  }).catch((error) => {
    console.error(`Error fetching options for the ${object} property ${property}:`, error.response?.data?.message || error.message);
    Sentry.captureException(error)
    return false;
  })
}

module.exports = {
  getPropertyOptions
}