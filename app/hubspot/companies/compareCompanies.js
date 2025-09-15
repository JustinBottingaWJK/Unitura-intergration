const compareCompanies = async (relations, companies) => {
  const companiesToUpdate = [];
  const companiesToCreate = [];

  for (const relation of relations) {
    const company = await companies.find((company) => company.properties.ridder_code == relation.code);

    if (company) {
      companiesToUpdate.push({
        id: company.id,
        data: relation
      });
    } else {
      companiesToCreate.push({
        data: relation
      });
    }
  }

  return {
    companiesToUpdate: companiesToUpdate,
    companiesToCreate: companiesToCreate
  }
}

module.exports = {
  compareCompanies
}