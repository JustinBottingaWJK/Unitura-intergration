const { searchDeals } = require('./searchDeals')
const { compareDeals } = require('./compareDeals')
const { createDeal } = require('./createDeal')
const { updateDeal } = require('./updateDeal')
const { getDeal } = require('./getDeal')
const { associateDealToCompany } = require('./associateDealToCompany')
const { associateDealToContact } = require('./associateDealToContact')
const { retrieveOrCreateContact } = require('../contacts')
const { retrieveOrCreateCompany } = require('../companies')
const { deleteAssociations } = require('../deleteAssociations')
const { getOfferItems, getOfferItemsAssembly, getOrderItems, getOrderItemsAssembly, searchOrderItems, searchOrderItemsAssembly } = require('../../ridder/offerItems')
const { getDocId, getDocs } = require('../../ridder/offers')
const { getOrderById } = require('../../ridder/orders')
const { uploadDoc } = require('../docs');
const Sentry = require('@sentry/node');

const handleDeals = async (offers, orders, isProject, limiter, searchLimiter) => {
  return new Promise(async (resolve, reject) => {

    // Update or create new deals in HubSpot based on orders
    if (orders && orders.length > 0) {
      console.log(`We have ${orders.length} orders to process`);
    
      // Make sure we do not try to handle more than 90 orders at a time
      const orderChunks = await orders.reduce((all, one, i) => {
        const ch = Math.floor(i / 90);
        all[ch] = [].concat(all[ch] || [], one);
        return all;
      }, []);
    
      for (const chunk of orderChunks) {
        console.log(`Processing ${chunk.length} orders of total ${orders.length} orders`);
        
        // Filter orders that don't have references to offers
        const ordersToProcess = [];
        
        for (const order of chunk) {
          try {
            console.log(`Processing order ${order.id} (${order.ordernumber})`);
            
            // 1. Get the order items for this order
            const orderItems = await getOrderItems(order.id, isProject);
            const orderItemsAssembly = await getOrderItemsAssembly(order.id, isProject);
            
            // 2. Check if there is a reference to offerdetailitem or offerdetailassembly in the order items
            let hasOfferReference = false;
            let offerId = null;
    
            // Check regular order items for offer references
            if (orderItems && orderItems.length > 0) {
              for (const item of orderItems) {
                if (item.offerdetailitem && item.offerdetailitem.id) {
                  hasOfferReference = true;
                  console.log(`Found offerdetailitem with ID ${item.offerdetailitem.id}`);
                  
                  // Get the offer ID if available
                  if (item.offerdetailitem.offer && item.offerdetailitem.offer.id) {
                    offerId = item.offerdetailitem.offer.id;
                    console.log(`Found offer reference in order item: offer ID ${offerId}`);
                  } else {
                    console.log(`Offerdetailitem exists but has no offer reference`);
                  }
                  break;
                }
              }
            }

            // If no offer reference found in regular items, check assembly items
            if (!hasOfferReference && orderItemsAssembly && orderItemsAssembly.length > 0) {
              for (const item of orderItemsAssembly) {
                if (item.offerdetailassembly && item.offerdetailassembly.id) {
                  hasOfferReference = true;
                  console.log(`Found offerdetailassembly with ID ${item.offerdetailassembly.id}`);
                  
                  // Get the offer ID if available
                  if (item.offerdetailassembly.offer && item.offerdetailassembly.offer.id) {
                    offerId = item.offerdetailassembly.offer.id;
                    console.log(`Found offer reference in order assembly item: offer ID ${offerId}`);
                  } else {
                    console.log(`Offerdetailassembly exists but has no offer reference`);
                  }
                  break;
                }
              }
            }

            // 3. If no offer reference, add to orders to process
            if (!hasOfferReference) {
              console.log(`Order ${order.id} has no reference to an offer, will process as a standalone deal`);
              // Store order with its items for later processing
              ordersToProcess.push({
                order,
                orderItems,
                orderItemsAssembly
              });
            } else {
              console.log(`Order ${order.id} has a reference to an offerdetail${offerId ? ` (offer ID: ${offerId})` : ''}, skipping as it will be handled by the offer processing`);
            }
          } catch (error) {
            console.error(`Error processing order ${order.id}:`, error);
            Sentry.captureException(error);
          }
        }
        
        // Process orders that don't have references to offers
        if (ordersToProcess.length > 0) {
          console.log(`Processing ${ordersToProcess.length} orders without offer references`);
          
          // Convert orders to the format expected by compareDeals
          const ordersForComparison = ordersToProcess.map(item => ({
            id: item.order.id,
            ordernumber: item.order.ordernumber,
            relation: item.order.relation,
            contact: item.order.contact,
            // Add other necessary fields from the order
          }));
          
          // Search for existing deals in HubSpot
          const deals = await searchDeals(ordersForComparison, limiter, searchLimiter, isProject, true);
          // console.log(deals)
          
          if (deals === false) {
            console.log('Error while searching for deals in HubSpot');
            continue;
          }
          
          // Compare orders with existing deals to determine which to create and which to update
          const dealsToCRUD = await compareDeals(ordersForComparison, deals, isProject, true);
          console.log(`We have ${dealsToCRUD.dealsToUpdate.length} deals to update and ${dealsToCRUD.dealsToCreate.length} deals to create from orders`);
          
          // Create new deals based on order
          if (dealsToCRUD.dealsToCreate.length > 0) {
            console.log(`Creating ${dealsToCRUD.dealsToCreate.length} deals in HubSpot from orders`);
            for (const dealToCreate of dealsToCRUD.dealsToCreate) {
              // Find the corresponding order with its items
              const orderInfo = ordersToProcess.find(item => item.order.id === dealToCreate.data.id);
              
              if (!orderInfo) {
                console.log(`Could not find order info for deal to create with ID ${dealToCreate.data.id}, skipping`);
                continue;
              }
              
              let contactToAssociate = false;
              let companyToAssociate = false;
              let relationId = false;
              
              if (orderInfo.order.relation && orderInfo.order.relation.id) {
                const companyAndRelation = await retrieveOrCreateCompany(orderInfo.order.relation.id, isProject, limiter, searchLimiter);
                companyToAssociate = companyAndRelation.companyToAssociate;
                relationId = companyAndRelation.relationId;
              }
              
              if (orderInfo.order.contact && orderInfo.order.contact.id) {
                contactToAssociate = await retrieveOrCreateContact(orderInfo.order.contact.id, isProject, relationId, companyToAssociate, limiter, searchLimiter);
              }
              
              // Try to get document for order
              let docUrl = false;
              let isOrder = true;

              if (orderInfo.order.id) {
                try {
                  const docId = await getDocId(orderInfo.order.id, isProject, isOrder);
                  if (docId) {
                    const pdfBuffer = await getDocs(docId.id, isProject);
                    const uploadResult = await uploadDoc(pdfBuffer, orderInfo.order.id, docId.name, isProject, isOrder, limiter, searchLimiter);
                    docUrl = uploadResult.url ? uploadResult.url : false;
                  } else {
                    console.log(`No matching document found for order ${orderInfo.order.id}`); 
                  }
                } catch (error) {
                  Sentry.captureException(error);
                  console.error('Error processing and uploading document:', error);
                }
              }
              
              // Use same structure for order, like offer
              const orderData = {
                data: orderInfo.order
              };

              // Create the deal in HubSpot
              const dealId = await createDeal(orderData, [], [], orderInfo.orderItems, orderInfo.orderItemsAssembly, companyToAssociate, contactToAssociate, docUrl, isProject, limiter);
              
              if (dealId) {
                console.log(`Successfully created deal ${dealId} for order ${orderInfo.order.id}`);
              } else {
                console.log(`Failed to create deal for order ${orderInfo.order.id}`);
              }
            }
          }
          
          // Update existing deals based on order
          if (dealsToCRUD.dealsToUpdate.length > 0) {
            console.log(`Updating ${dealsToCRUD.dealsToUpdate.length} deals in HubSpot from orders`);
            for (const dealToUpdate of dealsToCRUD.dealsToUpdate) {
              // Find the corresponding order with its items
              const orderInfo = ordersToProcess.find(item => item.order.id === dealToUpdate.data.id);
              
              if (!orderInfo) {
                console.log(`Could not find order info for deal to update with ID ${dealToUpdate.data.id}, skipping`);
                continue;
              }
              
              // Try to get document for order
              let docUrl = false;
              let isOrder = true;

              if (orderInfo.order.id) {
                try {
                  const docId = await getDocId(orderInfo.order.id, isProject, isOrder);
                  console.log(`!!Found document ID ${docId.id} for order ${orderInfo.order.id}`);
                  if (docId) {
                    const pdfBuffer = await getDocs(docId.id, isProject);
                    const uploadResult = await uploadDoc(pdfBuffer, orderInfo.order.id, docId.name, isProject, isOrder, limiter, searchLimiter);
                    docUrl = uploadResult.url ? uploadResult.url : false;
                  } else {
                    console.log(`No matching document found for order ${orderInfo.order.id}`); 
                  }
                } catch (error) {
                  Sentry.captureException(error);
                  console.error('Error processing and uploading document:', error);
                }
              }
              
              // Update the deal in HubSpot
              const dealId = await updateDeal({id: dealToUpdate.id, data: orderInfo.order},[], [], orderInfo.orderItems, orderInfo.orderItemsAssembly, docUrl, isProject, limiter);
              
              if (dealId) {
                console.log(`Successfully updated deal ${dealId} for order ${orderInfo.order.id}`);
                
                // Handle associations
                let contactToAssociate = false;
                let companyToAssociate = false;
                let relationId = false;
                
                if (orderInfo.order.relation && orderInfo.order.relation.id) {
                  const companyAndRelation = await retrieveOrCreateCompany(orderInfo.order.relation.id, isProject, limiter, searchLimiter);
                  companyToAssociate = companyAndRelation.companyToAssociate;
                  relationId = companyAndRelation.relationId;
                }
                
                if (orderInfo.order.contact && orderInfo.order.contact.id) {
                  contactToAssociate = await retrieveOrCreateContact(orderInfo.order.contact.id, isProject, relationId, companyToAssociate, limiter, searchLimiter);
                }
                
                const currentDeal = await getDeal(dealId, limiter);
                
                if (currentDeal && currentDeal.associations) {
                  if (contactToAssociate && currentDeal.associations.contacts) {
                    if (currentDeal.associations.contacts.results.length === 0 || 
                        currentDeal.associations.contacts.results[0].id != contactToAssociate) {
                      console.log(`Deal ${currentDeal.id} is not associated with contact ${contactToAssociate}, updating association`);
                      if (currentDeal.associations.contacts.results.length > 0) {
                        await deleteAssociations(currentDeal.id, currentDeal.associations.contacts.results, 'deals', 'contacts', limiter);
                      }
                      await associateDealToContact(dealId, contactToAssociate, limiter);
                    }
                  }
                  
                  if (companyToAssociate && currentDeal.associations.companies) {
                    if (currentDeal.associations.companies.results.length === 0 || 
                        currentDeal.associations.companies.results[0].id != companyToAssociate) {
                      console.log(`Deal ${currentDeal.id} is not associated with company ${companyToAssociate}, updating association`);
                      if (currentDeal.associations.companies.results.length > 0) {
                        await deleteAssociations(currentDeal.id, currentDeal.associations.companies.results, 'deals', 'companies', limiter);
                      }
                      await associateDealToCompany(dealId, companyToAssociate, limiter);
                    }
                  }
                }
              } else {
                console.log(`Failed to update deal for order ${orderInfo.order.id}`);
              }
            }
          }
        }
      }
    }

    // Update or create new deals in HubSpot based on offers
    if (offers.length > 0) {
      console.log(`We have ${offers.length} offers to process`);

      // Make sure we do not try to handle more than 90 offers at a time
      const chuncks = await offers.reduce((all, one, i) => {
        const ch = Math.floor(i / 90);
        all[ch] = [].concat(all[ch] || [], one);
        return all;
      }, []);

      for (const chunck of chuncks) {
        console.log(`Handling ${chunck.length} offers of total ${offers.length} offers`);
        const deals = await searchDeals(chunck, limiter, searchLimiter, isProject, false);

        if (deals === false) {
          console.log('Error while searching for deals in HubSpot');
          continue;
        }

        const dealsToCRUD = await compareDeals(chunck, deals, isProject, false);
        console.log(`We have ${dealsToCRUD.dealsToUpdate.length} deals to update and ${dealsToCRUD.dealsToCreate.length} deals to create`);


        if (dealsToCRUD.dealsToCreate.length > 0) {
          console.log(`Creating ${dealsToCRUD.dealsToCreate.length} deals in HubSpot`);
          for (const deal of dealsToCRUD.dealsToCreate) {
            let orderId = false;
            let orderItems = false;
            let orderItemsAssembly = false;
            let docUrl = false;

            const offerItems = await getOfferItems(deal.data.id, isProject);
            const offerItemsAssembly = await getOfferItemsAssembly(deal.data.id, isProject);

            if ((offerItems && offerItems.length > 0 && deal.data.isorder) || (offerItemsAssembly && offerItemsAssembly.length > 0 && deal.data.isorder)) {
              console.log(`Checking if we have order items available for offer ${deal.data.id}`);
              const result = offerItems && offerItems.length > 0 ? await searchOrderItems(offerItems, isProject) : false;
              const resultAssembly = offerItemsAssembly && offerItemsAssembly.length > 0 ? await searchOrderItemsAssembly(offerItemsAssembly, isProject) : false;
              if ((result && result.length > 0) || (resultAssembly && resultAssembly.length > 0)) {
                orderId = result && result.length > 0 ? result[0].order.id : resultAssembly[0].order.id;
                console.log(`We have found order items for offer ${deal.data.id} offernumber ${deal.data.offernumber}, searching for all order items based on order ${orderId}`);
                orderItems = await getOrderItems(orderId, isProject);
                orderItemsAssembly = await getOrderItemsAssembly(orderId, isProject);
              }
            }

            let contactToAssociate = false;
            let companyToAssociate = false;
            let relationId = false;
            let isOrder = false;

            if (deal.data.relation && deal.data.relation.id) {
              const companyAndRelation = await retrieveOrCreateCompany(deal.data.relation.id, isProject, limiter, searchLimiter);
              companyToAssociate = companyAndRelation.companyToAssociate;
              relationId = companyAndRelation.relationId;
            }

            if (deal.data.contact && deal.data.contact.id) {
              contactToAssociate = await retrieveOrCreateContact(deal.data.contact.id, isProject, relationId, companyToAssociate, limiter, searchLimiter);
            }

            if (deal.data.id) {
              try {
                const docId = await getDocId(deal.data.id, isProject, isOrder);
                if (docId) {
                  const pdfBuffer = await getDocs(docId.id, isProject);
                  const uploadResult = await uploadDoc(pdfBuffer, deal.data.id, docId.name, isProject, isOrder, limiter, searchLimiter);
                  docUrl = uploadResult.url ? uploadResult.url : false;
                } else {
                  console.log(`No matching document found for deal ${deal.data.id}`); 
                }
              } catch (error) {
                Sentry.captureException(error)
                console.error('Error processing and uploading document:', error);
              }
            }

            const dealId = await createDeal(deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, companyToAssociate, contactToAssociate, docUrl, isProject, limiter);
          }
        }

        if (dealsToCRUD.dealsToUpdate.length > 0) {
          console.log(`Updating ${dealsToCRUD.dealsToUpdate.length} deals in HubSpot`);
          for (const deal of dealsToCRUD.dealsToUpdate) {
            let orderId = false;
            let orderItems = false;
            let orderItemsAssembly = false;
            let docUrl = false;
            let isOrder = false;

            const offerItems = await getOfferItems(deal.data.id, isProject);
            const offerItemsAssembly = await getOfferItemsAssembly(deal.data.id, isProject);

            if ((offerItems && offerItems.length > 0 && deal.data.isorder) || (offerItemsAssembly && offerItemsAssembly.length > 0 && deal.data.isorder)) {
              console.log(`Checking if we have order items available for offer ${deal.data.id}`);
              const result = offerItems && offerItems.length > 0 ? await searchOrderItems(offerItems, isProject) : false;
              const resultAssembly = offerItemsAssembly && offerItemsAssembly.length > 0 ? await searchOrderItemsAssembly(offerItemsAssembly, isProject) : false;
              if ((result && result.length > 0) || (resultAssembly && resultAssembly.length > 0)) {
                orderId = result && result.length > 0 ? result[0].order.id : resultAssembly[0].order.id;
                console.log(`We have found order items for offer ${deal.data.id} offernumber ${deal.data.offernumber}, searching for all order items based on order ${orderId}`);
                orderItems = await getOrderItems(orderId, isProject);
                orderItemsAssembly = await getOrderItemsAssembly(orderId, isProject);
              }
            }

            if (deal.data.id) {
              try {
                const docId = await getDocId(deal.data.id, isProject, isOrder);
                if (docId) {
                  const pdfBuffer = await getDocs(docId.id, isProject);
                  const uploadResult = await uploadDoc(pdfBuffer, deal.data.id, docId.name, isProject, isOrder, limiter, searchLimiter);
                  docUrl = uploadResult.url ? uploadResult.url : false;
                } else {
                  console.log(`No matching document found for deal ${deal.data.id}`); 
                }
              } catch (error) {
                Sentry.captureException(error);
                console.error('Error processing and uploading document:', error);
              }
            }

            const dealId = await updateDeal(deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, docUrl, isProject, limiter);

            let contactToAssociate = false;
            let companyToAssociate = false;
            let relationId = false;

            if (deal.data.relation && deal.data.relation.id) {
              const companyAndRelation = await retrieveOrCreateCompany(deal.data.relation.id, isProject, limiter, searchLimiter);
              companyToAssociate = companyAndRelation.companyToAssociate;
              relationId = companyAndRelation.relationId;
            }

            if (deal.data.contact && deal.data.contact.id) {
              contactToAssociate = await retrieveOrCreateContact(deal.data.contact.id, isProject, relationId, companyToAssociate, limiter, searchLimiter);
            }

            const currentDeal = await getDeal(dealId, limiter);

            if (currentDeal && currentDeal.associations) {
              if (contactToAssociate && currentDeal.associations.contacts) {
                if (currentDeal.associations.contacts.results[0].id != contactToAssociate) {
                  console.log(`Deal ${currentDeal.id} is not associated with contact ${contactToAssociate}, deleting current association`);
                  await deleteAssociations(currentDeal.id, currentDeal.associations.contacts.results, 'deals', 'contacts', limiter);
                }
              }

              if (companyToAssociate && currentDeal.associations.companies) {
                if (currentDeal.associations.companies.results[0].id != companyToAssociate) {
                  console.log(`Deal ${currentDeal.id} is not associated with company ${companyToAssociate}, deleting current association`);
                  await deleteAssociations(currentDeal.id, currentDeal.associations.companies.results, 'deals', 'companies', limiter);
                }
              }
            }

            if (companyToAssociate) {
              await associateDealToCompany(deal.id, companyToAssociate, limiter);
            }

            if (contactToAssociate) {
              await associateDealToContact(deal.id, contactToAssociate, limiter);
            }
          }
        }
      }

      resolve(true);
    } else {
      console.log('No offers to process');
      resolve(true);
    }
  });
};

module.exports = {
  handleDeals,
};