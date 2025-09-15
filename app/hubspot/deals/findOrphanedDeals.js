const Sentry = require('@sentry/node');
const { getAllHSRidderDeals } = require('./getAllHSRidderDeals');

// Finds deals that exist in HubSpot but not in Ridder

const findOrphanedDeals = async (currentRidderOffers, isProject, limiter, searchLimiter) => {
  try {
    console.log(`Finding orphaned ${isProject ? 'project' : 'regular'} deals...`);
    
    // Get all deals from HubSpot that were synced from Ridder
    const hubspotDeals = await getAllHSRidderDeals(limiter, searchLimiter);
    
    if (!hubspotDeals || hubspotDeals.length === 0) {
      console.log('No Ridder deals found in HubSpot or error occurred');
      return [];
    }
    
    // Create map of current Ridder offers for quick lookup
    const ridderOfferMap = new Map();
    
    // Map offers by ID
    if (currentRidderOffers && currentRidderOffers.length > 0) {
      currentRidderOffers.forEach(offer => {
        const baseId = isProject ? `project-${offer.id}` : `${offer.id}`;
        ridderOfferMap.set(baseId, {
          id: offer.id,
          description: offer.description || '',
          offernumber: offer.offernumber || ''
        });
      });
    }
    
    console.log(`Found ${ridderOfferMap.size} ${isProject ? 'project' : 'regular'} offers in Ridder`);
    console.log(`Processing ${hubspotDeals.length} deals from HubSpot`);
    
    // Find deals that exist in HubSpot but not in Ridder
    const orphanedDeals = [];
    let processedCount = 0;
    let skippedProjectMismatch = 0;
    let skippedOrderDeals = 0;
    let skippedClosedDeals = 0;
    
    for (const deal of hubspotDeals) {
      const ridderId = deal.properties.ridder_id;
      
      // Skip deals that don't match our project/regular filter
      const isProjectDeal = ridderId.includes('project-');
      if (isProjectDeal !== isProject) {
        skippedProjectMismatch++;
        continue;
      }
      
      // Skip order deals - they are always won
      if (ridderId.includes('-order')) {
        skippedOrderDeals++;
        continue;
      }
      
      // Skip deals that are already in closed states
      const dealstage = deal.properties.dealstage;
      if (dealstage === 'closedwon' || dealstage === 'closedlost' || 
          dealstage === '503961309' || dealstage === '503961310') {
        skippedClosedDeals++;
        continue;
      }
      
      // Check if the deal exists in Ridder
      const ridderEntity = ridderOfferMap.get(ridderId);
      processedCount++;
      
      if (!ridderEntity) {
        // Deal doesn't exist in Ridder, add to deletion list
        console.log(`Deal ${deal.id} with Ridder ID ${ridderId} not found in Ridder`);
        
        // Additional verification: check if offer number matches
        // This helps prevent deleting deals if Ridder IDs are reused
        let shouldDelete = true;
        
        // Verify by offer number
        if (deal.properties.offer_number) {
          // Check if any offer in Ridder has the same offer number
          for (const [_, offer] of ridderOfferMap.entries()) {
            if (offer.offernumber === deal.properties.offer_number) {
              console.log(`Found offer with matching number ${deal.properties.offer_number}, not deleting deal ${deal.id}`);
              shouldDelete = false;
              break;
            }
          }
        }
        
        if (shouldDelete) {
          orphanedDeals.push(deal);
        }
      }
    }
    
    console.log(`Found ${orphanedDeals.length} orphaned ${isProject ? 'project' : 'regular'} deals`);
    console.log(`Processing summary: ${processedCount} processed, ${skippedProjectMismatch} project mismatch, ${skippedOrderDeals} order deals, ${skippedClosedDeals} closed deals`);
    return orphanedDeals;
    
  } catch (error) {
    console.error(`Error in findOrphanedDeals for ${isProject ? 'project' : 'regular'} deals:`, error);
    Sentry.captureException(error);
    return [];
  }
};

module.exports = {
  findOrphanedDeals
};