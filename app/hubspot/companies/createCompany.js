const axios = require('axios');
const Sentry = require('@sentry/node');
const { formatCompanyData } = require('./formatCompanyData')
const { searchCompanies } = require('./searchCompanies')

const createCompany = async (company, isProject, limiter, searchLimiter) => {
  console.log(`Trying to create company with Ridder ID: ${company.data.id}`);
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const data = {
    properties: await formatCompanyData(company, isProject)
  }

  return axios({
    method: 'post',
    url: `https://api.hubapi.com/crm/v3/objects/companies`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully created HubSpot company: ${response.data.id} based on Ridder company: ${company.data.id}`)
    return response.data.id
  }).catch(async(error) => {
    console.log(`Failed to create HubSpot company with Ridder ID: ${company.data.id}`)
    console.log(error.response.data)

    if (error.response.data.category === 'VALIDATION_ERROR' && error.response.data.message && error.response.data.message.includes(' already has that value')) {
      const companies = await searchCompanies([{code: company.data.code}], limiter, searchLimiter);
      if (companies && companies[0]) {
        return companies[0].id;
      } else {
        return null;
      }
    } else {
      Sentry.captureException(error)
    }
  })
}

module.exports = {
  createCompany
}