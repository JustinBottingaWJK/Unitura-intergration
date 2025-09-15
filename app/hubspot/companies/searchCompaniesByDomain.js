const axios = require('axios');
const Sentry = require('@sentry/node');

const extractDomain = (url) => {
  if (!url) return null;
  
  // Remove any protocol if present
  let domain = url.replace(/^https?:\/\//, '');
  
  // Remove www. if present
  domain = domain.replace(/^www\./, '');
  
  // Remove any path or query parameters
  domain = domain.split('/')[0];
  
  // Check if we have a valid domain format
  if (domain.includes('.')) {
    return domain;
  }
  
  console.log(`Invalid domain format: ${url}`);
  return null;
};

const searchCompaniesByDomain = async (domain, limiter, searchLimiter) => {
  if (!domain) {
    console.log('No domain provided for company search');
    return false;
  }
  
  const rootDomain = extractDomain(domain);
  if (!rootDomain) {
    console.log(`Could not extract valid domain from ${domain}`);
    return false;
  }

  console.log(`Searching for companies in HubSpot with domain containing: ${rootDomain}`);
  
  const remainingTokens = await limiter.removeTokens(1);
  console.log('Remaining tokens:', remainingTokens);

  const remainingSearchTokens = await searchLimiter.removeTokens(1);
  console.log('Remaining search tokens:', remainingSearchTokens);

  // Search for company based on domain
  const data = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'domain',
            operator: 'CONTAINS',
            value: rootDomain
          }
        ]
      }
    ],
    properties: ['hs_object_id', 'ridder_id', 'ridder_code', 'sync_timestamp', 'name', 'domain', 'website'],
    limit: 100
  };

  return axios({
    method: 'post',
    url: 'https://api.hubapi.com/crm/v3/objects/companies/search',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully found ${response.data.results.length} companies in HubSpot by domain`);
    return response.data.results;
  }).catch((error) => {
    console.log(`Error while searching for companies by domain in HubSpot:`);
    Sentry.captureException(error);
    return false;
  });
};

module.exports = {
  searchCompaniesByDomain
};