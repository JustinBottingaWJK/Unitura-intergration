const axios = require('axios')
const Sentry = require('@sentry/node');

const searchOrderItemsAssembly = async (offerItems, isProject) => {
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY
  console.log(`Searching for order items (assembly) based on the ${offerItems.length} offer items (assembly)`)
  // Create a query where we search for an orderitem that has a reference to the offeritem
  const filter = offerItems.map((offerItem) => `(offerdetailassembly.id[eq]"${offerItem.id}")`).join(' or ')

  const orderItems = []
  let page = 1

  await axios({
    method: 'get',
    url: `${url}/sales/salesorderdetailsassembly`,
    headers: {
      'X-API-KEY': apiKey
    },
    params: {
      filter: filter,
      page: page,
      size: 200
    }
  }).then((response) => {
    console.log(`Succesfully found ${response.data.length} order items (assembly) from Ridder for based on the offerItem ids`)
    orderItems.push(...response.data)
  }).catch((error) => {
    Sentry.captureException(error)
  })

  return orderItems
}

module.exports = {
  searchOrderItemsAssembly
}