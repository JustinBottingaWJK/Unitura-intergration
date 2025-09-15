const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatContactData } = require('./formatContactData');

const createContact = async (contact, person, companyToAssociate, isProject, limiter) => {
  console.log(`Trying to create contact with Ridder ID: ${contact.data.id}`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const data = {
    properties: await formatContactData(contact, person, isProject)
  }

  if (companyToAssociate) {
    data.associations = [
      {
        to: {
          id: companyToAssociate
        },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 279
          },
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 1 // Verify with Elles if we should also pass the primary label
          }
        ]
      }
    ]
  }

  return axios({
    method: 'post',
    url: `https://api.hubapi.com/crm/v3/objects/contacts`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully created HubSpot contact: ${response.data.id} based on Ridder contact: ${contact.data.id}`)
    return response.data.id
  }).catch(async(error) => {
    console.log(`Failed to create HubSpot contact with Ridder ID: ${contact.data.id}`)
    Sentry.captureException(error)

    return null
  })
}

module.exports = {
  createContact
}