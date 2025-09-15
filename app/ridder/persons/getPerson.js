const axios = require('axios')
const Sentry = require('@sentry/node');

const getPerson = async (personId, isProject) => {
  console.log(`Retrieving person ${personId} from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const person = await axios({
    method: 'get',
    url: `${url}/crm/persons/${personId}`,
    headers: {
      'X-API-KEY': apiKey
    }
  }).then((response) => {
    console.log(`Succesfully retrieved person ${response.data.id} from Ridder`)

    return response.data
  }).catch((error) => {
    console.log(`Error while retrieving person ${personId} from Ridder`)
    Sentry.captureException(error)
  })

  return person
}

module.exports = {
  getPerson
}