const formatDealData = async (deal, offerItems, offerItemsAssembly, orderItems, orderItemsAssembly, docUrl, isProject) => {
  const offerAmountItems = offerItems ? offerItems.reduce((total, item) => total + item.netsalesamount, 0) : 0
  const offerAmountAssembly = offerItemsAssembly ? offerItemsAssembly.reduce((total, item) => total + item.netsalesamount, 0) : 0
  const orderAmountItems = orderItems && deal.data.isorder ? orderItems.reduce((total, item) => total + item.netsalesamount, 0) : 0
  const orderAmountAssembly = orderItemsAssembly && deal.data.isorder ? orderItemsAssembly.reduce((total, item) => total + item.netsalesamount, 0) : 0

  // If order amount or order amount assembly is larger then 0, use order amount, else use offer amount
  const finalAmountItems = orderAmountItems > 0 ? orderAmountItems : orderAmountAssembly > 0 ? 0 : offerAmountItems;
  const finalAmountAssembly = orderAmountAssembly > 0 ? orderAmountAssembly : orderAmountItems > 0 ? 0 : offerAmountAssembly;

  const amount = finalAmountItems + finalAmountAssembly;
  const isOrderNumber = deal.data.ordernumber

  const data = {
    ridder_id: isProject ? `project-${deal.data.id}${isOrderNumber ? '-order' : ''}` : `${deal.data.id}${isOrderNumber ? '-order' : ''}`,
    offer_number: deal.data.offernumber || '',
    dealname: `${deal.data.offernumber ? deal.data.offernumber : ''}${deal.data.ordernumber ? deal.data.ordernumber + ' direct order' : ''} | ${deal.data.description ? deal.data.description : ''} | ${deal.data.relation && deal.data.relation.name ? deal.data.relation.name : ''}`,
    pipeline: isProject ? 'default': 317033181,
    dealstage: deal.data.workflowstate ? getDealStage(isProject, isOrderNumber, deal.data.workflowstate.state) : getDealStage(isProject, isOrderNumber, false),
    sync_timestamp: new Date(),
    amount: Math.max(0, deal.data.totalnetamount || amount),
    salesperson_code: deal.data.salesperson?.code || '',
    reference: deal.data.reference || '',
    deliverydate: deal.data.deliverydate ? new Date(deal.data.deliverydate).setUTCHours(0,0,0,0) : '',
    offerdate: deal.data.offerdate ? new Date(deal.data.offerdate).setUTCHours(0,0,0,0) : '',
    description: deal.data.description || '',
    werkvoorbereider: deal.data.planner?.recordtag || '',
    closed_lost_reason: deal.data.rejectioncode?.description || '',
    ordercategory: deal.data.ordercategory?.code || '',
    memo_intern: deal.data.memointern || '',
    order_source: deal.data.ordermethod?.description || '',
    order_number: deal.data.ordernumber || '',
    orderdate: deal.data.orderdate ? new Date(deal.data.orderdate).setUTCHours(0,0,0,0) : '',
  }

  // console.log('Order data:', deal)

  if (docUrl) {
    data.document_url = docUrl;
  }

  if (deal.data.ordernumber) {
    data.closedate = new Date(deal.data.orderdate).setUTCHours(0,0,0,0);
  }

  // console.log('Formatted deal data:', data)
  return data
}

const getDealStage = (isProject, isOrderNumber, state) => {
  if (isProject) {
    // If it's an order number, always return closedwon regardless of state
    if (isOrderNumber) {
      return 'closedwon';
    }

    switch (state) {
      case 'New':
        return 'qualifiedtobuy'
      case 'Submitted':
        return 'presentationscheduled'
      case 'Order':
        return 'closedwon'
      case 'Revised':
        return '606546923'
      case 'Historic':
        return '606546914'
      case 'Rejected':
        return 'closedlost'
      default:
        return 'qualifiedtobuy'
    }
  } else {
      // If it's an order number, always return 503961309 regardless of state
      if (isOrderNumber) {
        return '503961309';
      }

      switch (state) {
        case 'New':
          return '503961305'
        case 'Submitted':
          return '503961306'
        case 'Order':
          return '503961309'
        case 'Revised':
          return '606545852'
        case 'Historic':
          return '606546915'
        case 'Rejected':
          return '503961310'
        default:
          return '503961305'
      }
    }
}

module.exports = {
  formatDealData
}