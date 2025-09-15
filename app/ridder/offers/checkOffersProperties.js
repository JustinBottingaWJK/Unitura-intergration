const { getPropertyOptions, addPropertyOptions } = require('../../helpers/');

const checkOffersProperties = async (offers, limiter) => {
  console.log(`Checking ${offers.length} offer properties`);

  // Extract all planner group options across all offers
  const plannerGroupOptions = offers.map(
    (offer) => offer?.planner?.recordtag || null
  );

  // Remove duplicates from extracted options
  const uniquePlannerGroupOptions = [...new Set(plannerGroupOptions)];

  // Fetch current property options for planner groups
  const currentPlannerOptions = await getPropertyOptions('deals', 'werkvoorbereider');
  const currentPlannerArray = currentPlannerOptions.map((option) => option.value);

  // Identify missing planner options
  const missingPlannerOptions = uniquePlannerGroupOptions.filter(
    (value) => !currentPlannerArray.includes(value)
  );

  // Add missing planner options if needed
  if (missingPlannerOptions.length > 0) {
    await addPropertyOptions(
      { options: currentPlannerOptions },
      missingPlannerOptions,
      'deals',
      'werkvoorbereider',
      limiter
    );
  }
};


module.exports = {
  checkOffersProperties,
};