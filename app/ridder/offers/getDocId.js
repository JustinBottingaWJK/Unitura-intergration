const axios = require('axios');
const Sentry = require('@sentry/node');

const getDocId = async (recordID, isProject, isOrder) => {
  console.log(`Retrieving document based on ${isOrder ? 'orderId' : 'offerId'} ${recordID}.`);
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST;
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY;

  let page = 1;
  const size = 200;

  try {
    const response = await axios({
      method: 'get',
      url: `${url}${isOrder ? '/production/orders/' : '/sales/salesoffers/'}${recordID}/documents`,
      headers: {
        'X-API-KEY': apiKey,
      },
      params: {
        page: page,
        size: size,
      },
    });

    // loop through response.data in reverse to find the last item with .pdf extension
    for (let i = response.data.length - 1; i >= 0; i--) {
      const documentLocation = response.data[i].documentlocation.toLowerCase();
      if (response.data[i].extension.toLowerCase() === '.pdf' && 
          (documentLocation.includes('\\verkoop\\offerte\\') || 
           documentLocation.includes('\\verkoop\\orderbevestiging\\'))) {
        console.log(`Found .pdf document with id: ${response.data[i].id}`);
        // console.log(`Location: ${response.data[i].documentlocation}`);
        return { id: response.data[i].id, name: response.data[i].name }; // Return an object with both id and name
      }
    }

    console.log('No .pdf "offerte" document found.');
    return false; // Return false if no matching item is found
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error retrieving document id:', error);
  }
};

module.exports = {
  getDocId,
};