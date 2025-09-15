const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatCompanyData } = require('./formatCompanyData')

const updateCompany = async (company, isProject, limiter) => {
  console.log(`Trying to update company with Ridder Code: ${company.data.code} and HubSpot ID: ${company.id}`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const data = {
    properties: await formatCompanyData(company, isProject)
  }

  return axios({
    method: 'patch',
    url: `https://api.hubapi.com/crm/v3/objects/companies/${company.id}`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully updated HubSpot company: ${response.data.id} based on Ridder company: ${company.data.code}`)
    return response.data.id
  }).catch(async(error) => {
    console.log(`Failed to updated HubSpot company ${company.id} with Ridder Code: ${company.data.code}`)
    Sentry.captureException(error)

    return null
  })
}

module.exports = {
  updateCompany
}