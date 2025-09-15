const { searchCompanies } = require('./searchCompanies');
const { createCompany } = require('./createCompany');
const { getRelation } = require('../../ridder/relations');
const { searchCompaniesByDomain } = require('./searchCompaniesByDomain');

const retrieveOrCreateCompany = async (relationId, isProject, limiter, searchLimiter) => {
  let companyToAssociate = false;
  let relation = await getRelation(relationId, isProject);

  const TEST_MODE = process.env.TEST_MODE === 'true';
  console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] Starting company retrieval for relation ID: ${relationId}`);

  if (relation) {
    const companies = await searchCompanies([{code: relation.code}], limiter, searchLimiter);
    
    if (companies && companies[0]) {
      console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] Successfully found company with Ridder ID: ${relationId} in HubSpot to associate with the deal`);
      companyToAssociate = companies[0].id;
    } else if (relation.website) {
      // If not found by Ridder code, try to find by domain
      console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] No company found with Ridder ID: ${relationId} in HubSpot, trying to find by domain: ${relation.website}`);
      const companiesByDomain = await searchCompaniesByDomain(relation.website, limiter, searchLimiter);
      
      if (companiesByDomain && companiesByDomain[0]) {
        console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] Successfully found company with domain from Ridder website: ${relation.website} in HubSpot (Company ID: ${companiesByDomain[0].id})`);

        if (!TEST_MODE) {
          // In live mode, use the company found by domain
          companyToAssociate = companiesByDomain[0].id;
          console.log(`[LIVE MODE] Using company found by domain search: ${companyToAssociate}`);
        } else {
          // In test mode, just log what would happen but return null
          console.log(`[TEST MODE] Would use company found by domain: ${companiesByDomain[0].id}`);
          console.log(`[TEST MODE] This would merge Ridder relation ${relation.id} with existing HubSpot company ${companiesByDomain[0].id}`);
          // Return null in test mode to indicate no company should be associated
          companyToAssociate = null;
        }
      } else {
        // If not found by domain either, create new company in live mode only
        console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] No company found with domain from Ridder website: ${relation.website} in HubSpot`);
        
        if (!TEST_MODE) {
          console.log(`[LIVE MODE] Creating new company`);
          companyToAssociate = await createCompany({ data: relation }, isProject, limiter, searchLimiter);
        } else {
          console.log(`[TEST MODE] Would create new company for Ridder relation ${relation.id}`);
          companyToAssociate = null;
        }
      }
    } else {
      // If no website to search by
      console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] No company found with Ridder ID: ${relationId} in HubSpot and no website available for domain search`);
      
      if (!TEST_MODE) {
        console.log(`[LIVE MODE] Creating new company`);
        companyToAssociate = await createCompany({ data: relation }, isProject, limiter, searchLimiter);
      } else {
        console.log(`[TEST MODE] Would create new company for Ridder relation ${relation.id}`);
        companyToAssociate = null;
      }
    }
  } else {
    console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] Company with Ridder ID: ${relationId} not found in Ridder`);
  }

  console.log(`[${TEST_MODE ? 'TEST MODE' : 'LIVE MODE'}] Company retrieval complete. Using company ID: ${companyToAssociate || 'none'}`);

  return {
    relationId: relation ? relation.id : false,
    companyToAssociate: companyToAssociate
  };
};

module.exports = {
  retrieveOrCreateCompany
};