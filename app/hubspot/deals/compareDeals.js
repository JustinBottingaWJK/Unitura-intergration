const compareDeals = async (records, deals, isProject, isOrderSource = false) => {
  const dealsToUpdate = [];
  const dealsToCreate = [];

  for (const record of records) {
    const baseId = isProject ? `project-${record.id}` : record.id.toString();
    const recordId = isOrderSource ? `${baseId}-order` : baseId;
    
    // Find a matching deal with the exact ID format
    const deal = deals.find((deal) => deal.properties.ridder_id === recordId);

    if (deal) {
      dealsToUpdate.push({
        id: deal.id,
        data: record
      });
    } else {
      dealsToCreate.push({
        data: record
      });
    }
  }

  return {
    dealsToUpdate: dealsToUpdate,
    dealsToCreate: dealsToCreate
  }
}

module.exports = {
  compareDeals
}