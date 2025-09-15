const axios = require("axios");
const Sentry = require("@sentry/node");

const addPropertyOptions = async (currentData, newOptions, object, property, limiter) => {
  console.log(`Adding ${newOptions.length} options to ${property}`);
  const remainingTokens = await limiter.removeTokens(1);
  console.log("Remaining tokens:", remainingTokens);

  // Filter out existing options with null labels or values
  const validExistingOptions = currentData.options.filter(
    option => option.label !== null && option.value !== null
  );

  const data = {
    options: [...validExistingOptions], // Clone existing valid options
  };

  // Filter out new options that are null
  const validNewOptions = newOptions.filter(option => option !== null);

  for (const newOption of validNewOptions) {
    data.options.push({
      label: newOption,
      value: newOption,
      hidden: false,
    });
  }

  return axios({
    method: "patch",
    url: `https://api.hubapi.com/crm/v3/properties/${object}/${property}`,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  })
    .then((response) => {
      if (response) {
        console.log(`Added ${validNewOptions.length} options to ${property}`);
        return true;
      } else {
        return null;
      }
    })
    .catch((error) => {
      Sentry.captureException(error);
      console.error(`Error adding options to ${property}: ${error.message}`);
      console.log(error);
      return null;
    });
};

module.exports = {
  addPropertyOptions,
};