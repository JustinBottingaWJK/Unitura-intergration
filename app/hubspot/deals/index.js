const { associateDealToCompany } = require('./associateDealToCompany')
const { associateDealToContact } = require('./associateDealToContact')
const { compareDeals } = require('./compareDeals')
const { createDeal } = require('./createDeal')
const { deleteDeal } = require('./deleteDeal')
const { deleteOrphanedDeals } = require('./deleteOrphanedDeals')
const { findOrphanedDeals } = require('./findOrphanedDeals')
const { getAllHSRidderDeals } = require('./getAllHSRidderDeals')
const { getDeal } = require('./getDeal')
const { handleDeals } = require('./handleDeals')
const { searchDeals } = require('./searchDeals')
const { updateDeal } = require('./updateDeal')
const { checkDirectOrdersWithZeroAmount } = require('./checkDirectOrdersWithZeroAmount')

module.exports = {
  associateDealToCompany,
  associateDealToContact,
  compareDeals,
  createDeal,
  deleteDeal,
  deleteOrphanedDeals,
  findOrphanedDeals,
  getAllHSRidderDeals,
  getDeal,
  handleDeals,
  searchDeals,
  updateDeal,
  checkDirectOrdersWithZeroAmount,
}