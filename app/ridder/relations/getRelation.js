const axios = require('axios')
const Sentry = require('@sentry/node');

const getRelation = async (relationId, isProject) => {
  console.log(`Retrieving relation ${relationId} from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const relation = await axios({
    method: 'get',
    url: `${url}/crm/relations/${relationId}`,
    headers: {
      'X-API-KEY': apiKey
    }
  }).then((response) => {
    console.log(`Succesfully retrieved relation ${response.data.id} from Ridder`)

    return response.data
  }).catch((error) => {
    console.log(`Error while retrieving relation ${relationId} from Ridder`)
    Sentry.captureException(error)
  })

  return relation
}

module.exports = {
  getRelation
}