const axios = require('axios')
const Sentry = require('@sentry/node');

const deleteAssociations = async (id, associations, objectFrom, objectTo, limiter) => {
  console.log(`Trying to delete all associations with ${objectTo} for ${objectFrom} ${id}`)
	const remainingTokens = await limiter.removeTokens(1)
	console.log('Remaining tokens:', remainingTokens)

  const inputs = await Promise.all(associations.map(async (association) => {
    return {
      from: {
        id: id
      },
      to: {
        id: association.id
      },
      type: association.type
    }
  }))

  const data = {
    inputs: inputs
  }
  
  return axios({
    method: 'post',
    url: `https://api.hubapi.com/crm/v3/associations/${objectFrom}/${objectTo}/batch/archive`,
    headers: {
      'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data)
  }).then((response) => {
    console.log(`Successfully deleted all associations with ${objectTo} for ${objectFrom} ${id}`)
    return true
  }).catch((error) => {
    console.log(error)
    console.log(`Error while deleting all associations with ${objectTo} for ${objectFrom} ${id}: ${error.response.data.message}`)
    Sentry.captureException(error)
    return false
  })
}

module.exports = {
	deleteAssociations,
}