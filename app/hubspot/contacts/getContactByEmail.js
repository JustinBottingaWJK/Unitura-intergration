const axios = require('axios');
const Sentry = require('@sentry/node');

const getContactByEmail = async (email, limiter) => {
  console.log(`Checking if a contact exists with email in HubSpot`); //${email}
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  return axios({
    method: 'get',
    url: `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    console.log(`Successfully retrieved contact ${response.data.vid} with email in HubSpot`) //${email}
    return response.data.vid;
  }).catch((error) => {
    if (error.response.data.message === 'contact does not exist' || error.response.data.category === 'OBJECT_NOT_FOUND') {
      console.log(`No contact exists with email ${email} in HubSpot`)
      return false
    } else {
      console.log(`Error while retrieving contact with email ${email}`);
      Sentry.captureException(error);
      return false
    }
  })
}

module.exports = {
  getContactByEmail
}