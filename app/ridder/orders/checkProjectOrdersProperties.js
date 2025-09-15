const { getPropertyOptions, addPropertyOptions } = require('../../helpers/');

const checkProjectOrdersProperties = async (projectOrders, limiter) => {
  console.log(`Checking ${projectOrders.length} project order properties`);

  // Extract all planner group options across all project orders
  const plannerGroupOptions = projectOrders.map(
    (order) => order?.planner?.recordtag || null
  );

  // Remove duplicates from extracted options
  const uniquePlannerGroupOptions = [...new Set(plannerGroupOptions)];

  // Fetch current property options for planner groups
  const currentPlannerOptions = await getPropertyOptions('deals', 'werkvoorbereider') || [];
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
  checkProjectOrdersProperties,
};