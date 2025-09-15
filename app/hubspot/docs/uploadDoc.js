const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const { searchExistingDoc } = require('./searchExistingDoc');

const uploadDoc = async (pdfBuffer, dealId, docName, isProject, isOrder, limiter, searchLimiter) => {
  const formData = new FormData();
  const randomFileName = crypto.randomBytes(4).toString('hex');
  const projectPrefix = isProject ? 'PRJ' : ''
  const orderSuffix = isOrder ? '-DO' : ''
  const fileName = `${randomFileName}-${projectPrefix}${docName}${orderSuffix}-${dealId}.pdf`;
  const existingDoc = await searchExistingDoc(docName, isProject, isOrder, limiter, searchLimiter);

  if (!existingDoc) {
    formData.append('file', pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf',
    });

    formData.append('folderId', '203167847630');

    const options = {
      access: 'PUBLIC_NOT_INDEXABLE'
    };
    formData.append('options', JSON.stringify(options));

    try {
      const response = await axios.post('https://api.hubspot.com/files/v3/files', formData, {
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
          ...formData.getHeaders(),
        },
      }
      );

      // Log and return the response data
      console.log('Upload successful');
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error.response?.data || error.message);
      Sentry.captureException(error)
      throw error;
    }
  } else {
    console.log('Document already exists for dealId:', dealId);
    return existingDoc;
  }
};

module.exports = { uploadDoc };