const { handleCompanies } = require('./handleCompanies')
const { searchCompanies } = require('./searchCompanies')
const { searchCompaniesByDomain } = require('./searchCompaniesByDomain')
const { retrieveOrCreateCompany } = require('./retrieveOrCreateCompany')

module.exports = {
  handleCompanies,
  searchCompanies,
  retrieveOrCreateCompany,
  searchCompaniesByDomain
}