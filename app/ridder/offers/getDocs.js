const axios = require('axios')
const Sentry = require('@sentry/node');

const getDocs = async (docId, isProject) => {
  console.log(`Retrieving document with ID ${docId}.`);
  const url = isProject ? process.env.PROJECTEN_HOST : process.env.UNITURA_HOST;
  const apiKey = isProject ? process.env.PROJECTEN_KEY : process.env.UNITURA_KEY;

  try {
    const response = await axios({
      method: 'get',
      url: `${url}/iqsystem/documents/${docId}/document`,
      headers: {
        'X-API-KEY': apiKey
      },
      responseType: 'arraybuffer' // Important for binary responses like PDFs
    });

    // Convert the response into a Buffer and return it
    const pdfBuffer = Buffer.from(response.data, 'binary');
    return pdfBuffer;

  } catch (error) {
    Sentry.captureException(error);
    console.error('Error retrieving document:', error);
  }
};

module.exports = {
  getDocs
};
