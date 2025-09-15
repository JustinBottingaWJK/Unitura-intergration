const axios = require('axios')
const Sentry = require('@sentry/node');

const getOffers = async (isProject) => {
  console.log(`Retrieving all offers from Ridder that have changed last minute.`)
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY

  const offers = []
  let needToRetrieveMore = true
  let page = 1
  const size = 200
  //const date = new Date()
  // date.setDate(date.getDate() - 1); // Move the date back
  //const today = `${date.getFullYear()}-${(date.getMonth() + 1)}-${(date.getDate())}`
  const today = `2024-12-20`
  // filter: `offernumber[eq]"302870"`,
  
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

    const config = {
      method: 'get',
      url:    `${url}/sales/salesoffers`,
      headers:{ 'X-API-KEY': apiKey },
      params: {
        size,
        page,
        filter: `datechanged[gte]"${oneMinAgo}"`,
        // filter: `datechanged[gte]"2025-01-01T00:00:00.000Z"`
      }
    };
  
    // log of exact URL + querystring
    // console.log('Full request URI:', axios.getUri(config));
  
    await axios(config)
      .then((response) => {
        console.log(`Successfully retrieved ${response.data.length} offers from Ridder`);
        offers.push(...response.data);
        // console.log(`remoteNow ${remoteNow}, oneMinAgo ${oneMinAgo}`);
  
        if (response.data.length === size) {
          console.log(`Retrieved ${offers.length} offers in total, retrieving next ${size}`);
          page += 1;
        } else {
          console.log(
            `Retrieved all offers from Ridder that have changed last minute, total of ${offers.length}`
          );
          needToRetrieveMore = false;
        }
      })
      .catch((error) => {
        Sentry.captureException(error);
        console.error('API error:', error.response?.status, error.response?.data || error.message);
        needToRetrieveMore = false;
      });
  }

  return offers
}

module.exports = {
  getOffers
}