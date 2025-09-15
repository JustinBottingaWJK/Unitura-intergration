const Sentry = require('@sentry/node');
const { deleteDeal } = require('./deleteDeal');

// Deletes orphaned deals from HubSpot

const deleteOrphanedDeals = async (orphanedDeals, limiter) => {
  try {
    console.log(`Deleting ${orphanedDeals.length} orphaned deals from HubSpot`);
    
    if (!orphanedDeals || orphanedDeals.length === 0) {
      console.log('No orphaned deals to delete');
      return true;
    }
    
    let allSuccessful = true;
    
    for (const deal of orphanedDeals) {
      const success = await deleteDeal(deal.id, limiter);
      if (!success) {
        allSuccessful = false;
      }
    }
    
    return allSuccessful;
  } catch (error) {
    console.error('Error in deleteOrphanedDeals:', error);
    Sentry.captureException(error);
    return false;
  }
};

module.exports = {
  deleteOrphanedDeals
};