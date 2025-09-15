
const axios = require('axios');
const Sentry = require('@sentry/node');
const { deleteDeal } = require('./deleteDeal');

const checkDirectOrdersWithZeroAmount = async (limiter, searchLimiter) => {
  console.log('Checking direct orders older than 10 days with zero amount...');
  
  try {
    // Calculate date 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const formattedDate = tenDaysAgo.getTime();
    
    // Remove tokens for rate limiting
    const remainingTokens = await limiter.removeTokens(1);
    console.log('Remaining tokens:', remainingTokens);
    
    const remainingSearchTokens = await searchLimiter.removeTokens(1);
    console.log('Remaining search tokens:', remainingSearchTokens);
    
    // Search for direct orders older than 10 days with zero amount
    const searchData = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "dealname",
              operator: "CONTAINS_TOKEN",
              value: "direct"
            },
            {
              propertyName: "amount",
              operator: "EQ",
              value: "0"
            },
            {
              propertyName: "createdate",
              operator: "LT",
              value: formattedDate
            }
          ]
        }
      ],
      properties: ["dealname", "amount", "createdate", "hs_object_id"],
      limit: 100
    };
    
    let hasMore = true;
    let after = 0;
    const dealsToDelete = [];
    const dealDetails = [];
    
    while (hasMore) {
      if (after) {
        searchData.after = after;
      }
      
      const response = await axios({
        method: 'post',
        url: 'https://api.hubapi.com/crm/v3/objects/deals/search',
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(searchData)
      });
      
      const { results, paging } = response.data;
      console.log(`Found ${results.length} direct orders older than 10 days with zero amount`);
      
      // Add deals to the delete list with details for logging
      results.forEach(deal => {
        dealsToDelete.push(deal.id);
        
        // Store deal details for logging
        dealDetails.push({
          id: deal.id,
          name: deal.properties.dealname,
          amount: deal.properties.amount,
          createDate: deal.properties.createdate,
        });
      });
      
      // Check if there are more results
      if (paging && paging.next && paging.next.after) {
        after = paging.next.after;
        
        // Remove tokens for rate limiting for the next request
        await limiter.removeTokens(1);
        await searchLimiter.removeTokens(1);
      } else {
        hasMore = false;
      }
    }
    
    // Log deals that would be deleted
    if (dealsToDelete.length > 0) {
      console.log(`Found ${dealsToDelete.length} direct orders with zero amount that will be deleted:`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const dealId of dealsToDelete) {
        const success = await deleteDeal(dealId, limiter);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      return successCount;
    } else {
      console.log('No direct orders with zero amount need to be deleted');
      return 0;
    }
  } catch (error) {
    console.error('Error checking direct orders with zero amount:', error.message);
    Sentry.captureException(error);
    return 0;
  }
};

module.exports = {
  checkDirectOrdersWithZeroAmount
};
