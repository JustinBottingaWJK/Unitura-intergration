const axios = require('axios');
const Sentry = require('@sentry/node');

const searchContacts = async (contacts, limiter, searchLimiter) => {
  const contactEmails = contacts.map(contact => contact.email.toString().toLowerCase());

  // console.log(`Searching for contacts in HubSpot based on email adresses from Ridder: ${contactEmails.join(', ')}`)
  console.log(`Searching for contacts in HubSpot based on email adresses from Ridder`)
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const remainingSearchTokens = await searchLimiter.removeTokens(1)
  console.log('Remaining search tokens:', remainingSearchTokens)

  const data = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'email',
            operator: 'IN',
            values: contactEmails
          }
        ]
      }
    ],
    properties: ['hs_object_id', 'ridder_id', 'sync_timestamp', 'firstname', 'email'],
    limit: 100
  }

  return axios({
    method: 'post',
    url: 'https://api.hubapi.com/crm/v3/objects/contacts/search',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Succesfully found ${response.data.results.length} contacts in HubSpot`)
    return response.data.results
  }).catch((error) => {
    console.log(`Error while searching for contacts in HubSpot:`)
    Sentry.captureException(error);
    return false
  })
}

module.exports = {
  searchContacts
};