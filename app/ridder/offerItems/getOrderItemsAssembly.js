const axios = require('axios')
const Sentry = require('@sentry/node');

const getOrderItemsAssembly = async (orderId, isProject) => {
  console.log(`Retrieving all order assembly details for order ${orderId}.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const orderItemsAssembly = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200

  while (needToRetrieveMore) {
    await axios({
      method: 'get',
      url: `${url}/sales/salesorderdetailsassembly`,
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        filter: `order.id[eq]"${orderId}"`,
        page: page,
        size: 200
      }
    }).then((response) => {
      console.log(`Succesfully retrieved ${response.data.length} order assembly details from Ridder for order ${orderId}`)
      orderItemsAssembly.push(...response.data)
      if (response.data.length == size) {
        console.log(`Retrieved ${orderItemsAssembly.length} order assembly details in total, retrieving next 200`)
        page = page + 1
      } else {
        console.log(`Retrieved all order assembly details from Ridder for order ${orderId}, total of ${orderItemsAssembly.length}`)
        needToRetrieveMore = false
      }
    }).catch((error) => {
      Sentry.captureException(error)
      needToRetrieveMore = false
    })
  }

  return orderItemsAssembly
}

module.exports = {
  getOrderItemsAssembly
}