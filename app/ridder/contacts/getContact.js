const axios = require('axios')
const Sentry = require('@sentry/node');

const getContact = async (contactId, isProject) => {
  console.log(`Retrieving contact ${contactId} from Ridder.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const contact = await axios({
    method: 'get',
    url: `${url}/crm/contacts/${contactId}`,
    headers: {
      'X-API-KEY': apiKey
    }
  }).then((response) => {
    console.log(`Succesfully retrieved contact ${response.data.id} from Ridder`)

    return response.data
  }).catch((error) => {
    console.log(`Error while retrieving contact ${contactId} from Ridder:`)
    Sentry.captureException(error);
  })

  return contact
}

module.exports = {
  getContact
}