const { searchCompanies } = require('./searchCompanies.js')
const { compareCompanies } = require('./compareCompanies')
const { updateCompany } = require('./updateCompany')

const handleCompanies = async (relations, isProject, limiter, searchLimiter) => {
  return new Promise(async (resolve, reject) => {
    if (relations.length > 0) {
      console.log(`We have ${relations.length} relations to process`)

      // Make sure we do not try to handle more than 90 relations at a time
      const chuncks = await relations.reduce((all, one, i) => {
        const ch = Math.floor(i / 90); 
        all[ch] = [].concat((all[ch] || []), one); 
        return all
      }, [])

      for (const chunck of chuncks) {
        console.log(`Handling ${chunck.length} relations of total ${relations.length} relations`)
        const companies = await searchCompanies(chunck, limiter, searchLimiter);

        if (companies === false) {
          console.log('Error while searching for companies in HubSpot')
          continue;
        }

        const companiesToCRUD = await compareCompanies(chunck, companies);
        console.log(`We have ${companiesToCRUD.companiesToUpdate.length} companies to update and ${companiesToCRUD.companiesToCreate.length} companies that do not have to be created in HubSpot`)
        
        if (companiesToCRUD.companiesToUpdate.length > 0) {
          console.log(`Updating ${companiesToCRUD.companiesToUpdate.length} companies in HubSpot`);
          for (const company of companiesToCRUD.companiesToUpdate) {
            const companyId = await updateCompany(company, isProject, limiter)
          }
        }
      }

      resolve(true)
    } else {
      console.log('No relations to process')
      resolve(true)
    }
  })
}

module.exports = {
  handleCompanies
}