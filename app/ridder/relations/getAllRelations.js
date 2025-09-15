const axios = require('axios')
const Sentry = require('@sentry/node');

const getAllRelations = async (isProject) => {
  console.log(`Retrieving all relations from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const relations = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200

  while (needToRetrieveMore) {
    await axios({
      method: 'get',
      url: `${url}/crm/relations`,
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        page: page,
        size: 200
      }
    }).then((response) => {
      console.log(`Succesfully retrieved ${response.data.length} relations from Ridder`)
      relations.push(...response.data)
      if (response.data.length == size) {
        console.log(`Retrieved ${relations.length} relations in total, retrieving next 200`)
        page = page + 1
      } else {
        console.log(`Retrieved all relations from Ridder, total of ${relations.length}`)
        needToRetrieveMore = false
      }

    }).catch((error) => {
      Sentry.captureException(error)
      needToRetrieveMore = false
    })
  }

  return relations
}

module.exports = {
  getAllRelations
}