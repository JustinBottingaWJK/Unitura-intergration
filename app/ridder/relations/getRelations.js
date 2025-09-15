const axios = require('axios')
const Sentry = require('@sentry/node');

const getRelations = async (isProject) => {
  console.log(`Retrieving all relations from Ridder that have changed last minute.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const relations = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200
  // const date = new Date()
  // date.setDate(date.getDate() - 3); // Move the date back
  //const today = `${date.getFullYear()}-${(date.getMonth() + 1)}-${(date.getDate())}`

  while (needToRetrieveMore) {
    function nowInZone(zone) {
      // Use Intl to pull out the local components in that zone
      const parts = new Intl.DateTimeFormat('en', {
        timeZone: zone,
        year:   'numeric',
        month:  '2-digit',
        day:    '2-digit',
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
    
      // Collect them into an object
      const vals = parts.reduce((acc, { type, value }) => {
        if (type !== 'literal') acc[type] = value;
        return acc;
      }, {});
      // Construct a UTC‐based Date from those components
      return new Date(Date.UTC(
        +vals.year,
        +vals.month - 1,
        +vals.day,
        +vals.hour,
        +vals.minute,
        +vals.second
      ));
    }

    let remoteNow = nowInZone('Europe/Amsterdam');

    // Subtract 120 000 ms (2 min)
    let oneMinAgo = new Date(remoteNow.getTime() - 120_000).toISOString();
    console.log('remoteNow', remoteNow);
    console.log('oneMinAgo', oneMinAgo);

    await axios({
      method: 'get',
      url: `${url}/crm/relations`,
      headers: {
        'X-API-KEY': apiKey
      },
      params: {
        filter: `datechanged[gte]"${oneMinAgo}"`,
        page: page,
        size: size
      }
    }).then((response) => {
      console.log(`Succesfully retrieved ${response.data.length} relations from Ridder`)
      relations.push(...response.data)
      console.log('oneMinAgo', oneMinAgo)
      if (response.data.length == size) {
        console.log(`Retrieved ${relations.length} relations in total, retrieving next 200`)
        page = page + 1
      } else {
        console.log(`Retrieved all relations from Ridder that have changed last minute, total of ${relations.length}`)
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
  getRelations
}