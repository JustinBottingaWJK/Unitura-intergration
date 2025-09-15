const { getOffers } = require('./getOffers')
const { getDocs } = require('./getDocs')
const { getDocId } = require('./getDocId')
const { checkProjectOffersProperties } = require('./checkProjectOffersProperties')
const { checkOffersProperties } = require('./checkOffersProperties')
const { fetchAllOffers } = require('./fetchAllOffers')

module.exports = {
  getOffers,
  getDocs,
  getDocId,
  checkProjectOffersProperties,
  checkOffersProperties,
  fetchAllOffers
}