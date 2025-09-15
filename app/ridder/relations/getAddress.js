const axios = require('axios')
const Sentry = require('@sentry/node');

const getAddress = async (addressId, isProject) => {
  console.log(`Retrieving address ${addressId} from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const relation = await axios({
    method: 'get',
    url: `${url}/crm/addresses/${addressId}`,
    headers: {
      'X-API-KEY': apiKey
    }
  }).then((response) => {
    console.log(`Succesfully retrieved address ${response.data.id} from Ridder`)

    return response.data
  }).catch((error) => {
    Sentry.captureException(error)
  })

  return relation
}

module.exports = {
  getAddress
}