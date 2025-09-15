const axios = require('axios')
const Sentry = require('@sentry/node');

const getOfferItems = async (offerId, isProject) => {
  console.log(`Retrieving all offer items for offer ${offerId}.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const offerItems = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200

  while (needToRetrieveMore) {
    await axios({
      method: 'get',
      url: `${url}/sales/offerdetailsitem`,
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        filter: `offer.id[eq]"${offerId}"`,
        page: page,
        size: 200
      }
    }).then((response) => {
      console.log(`Succesfully retrieved ${response.data.length} offer items from Ridder for offer ${offerId}`)
      offerItems.push(...response.data)
      if (response.data.length == size) {
        console.log(`Retrieved ${offerItems.length} offer items in total, retrieving next 200`)
        page = page + 1
      } else {
        console.log(`Retrieved all offer items from Ridder for offer ${offerId}, total of ${offerItems.length}`)
        needToRetrieveMore = false
      }
    }).catch((error) => {
      Sentry.captureException(error)
      needToRetrieveMore = false
    })
  }

  return offerItems
}

module.exports = {
  getOfferItems
}