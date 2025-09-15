const axios = require('axios')
const Sentry = require('@sentry/node');

const getOrderItems = async (orderId, isProject) => {
  console.log(`Retrieving all order items for order ${orderId}.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const orderItems = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200

  while (needToRetrieveMore) {
    await axios({
      method: 'get',
      url: `${url}/sales/salesorderdetailsitem`,
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        filter: `order.id[eq]"${orderId}"`,
        page: page,
        size: 200
      }
    }).then((response) => {
      console.log(`Succesfully retrieved ${response.data.length} order items from Ridder for order ${orderId}`)
      orderItems.push(...response.data)
      if (response.data.length == size) {
        console.log(`Retrieved ${orderItems.length} order items in total, retrieving next 200`)
        page = page + 1
      } else {
        console.log(`Retrieved all order items from Ridder for order ${orderId}, total of ${orderItems.length}`)
        needToRetrieveMore = false
      }
    }).catch((error) => {
      Sentry.captureException(error)
      needToRetrieveMore = false
    })
  }

  return orderItems
}

module.exports = {
  getOrderItems
}