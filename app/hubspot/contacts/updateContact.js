const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatContactData } = require('./formatContactData')

const updateContact = async (contact, person, isProject, limiter) => {
  console.log(`Trying to update contact with Ridder email and HubSpot ID: ${contact.id}`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const data = {
    properties: await formatContactData(contact, person, isProject)
  }

  return axios({
    method: 'patch',
    url: `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully updated HubSpot contact based on Ridder contact with email`)
    return response.data.id
  }).catch(async(error) => {
    console.log(`Failed to updated HubSpot contact ${contact.id} with Ridder with email`)
    Sentry.captureException(error);
    return null
  })
}

module.exports = {
  updateContact
}