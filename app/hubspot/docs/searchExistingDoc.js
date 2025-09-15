const axios = require('axios');
const Sentry = require('@sentry/node');

const searchExistingDoc = async (docName, isProject, isOrder, limiter, searchLimiter) => {
  console.log(`Searching for deals in HubSpot based on offer ID's from Ridder`)
  const remainingTokens = await limiter.removeTokens(1)
  console.log('Remaining tokens:', remainingTokens)

  const remainingSearchTokens = await searchLimiter.removeTokens(1)
  console.log('Remaining search tokens:', remainingSearchTokens)

  const projectPrefix = isProject ? 'PRJ' : ''
  const orderSuffix = isOrder ? '-DO' : ''


  try {
    const response = await axios({
      method: 'get',
      url: `https://api.hubapi.com/files/v3/files/search?name=${projectPrefix}${docName}${orderSuffix}&parentFolderId=203167847630`,
      headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
      },
      limit: 100
    });
    
    console.log(`Found ${response.data.results.length} files in HubSpot ${response.data.results.length > 0} `)
    // console.log('Files:', response.data.results.length > 0 ? response.data.results[0] : 'No files found')
    return response.data.results.length > 0 ? response.data.results[0] : null;

  } catch (error) {
      console.error('Error while searching for files in HubSpot:', error);
      console.log(error)
      Sentry.captureException(error);
      return false;
  }
};

module.exports = {
  searchExistingDoc
};