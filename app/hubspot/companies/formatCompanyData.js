const { getAddress } = require('../../ridder/relations/getAddress')

const formatCompanyData = async (company, isProject) => {
  let postaladdress = false
  let visitingaddress = false 

  if (company.data.postaladdress && company.data.postaladdress.id) {
    postaladdress = await getAddress(company.data.postaladdress.id, isProject)
  }
  if (company.data.visitingaddress && company.data.visitingaddress.id) {
    visitingaddress = await getAddress(company.data.visitingaddress.id, isProject)
  }
  const data = {
    ridder_id: company.data.id,
    sync_timestamp: new Date(),
    ridder_code: company.data.code,
    relationtype: company.data.relationtype?.description || '',
    city_postal: postaladdress?.city || '',
    zip_postal: postaladdress?.zipcode || '',
    country_postal: postaladdress?.country?.name || '',
    city_visiting: visitingaddress?.city || '',
    zip_visiting: visitingaddress?.zipcode || '',
    country_visiting: visitingaddress?.country?.name || '',
  }

  if (company.data.name) {
    data.name = company.data.name
  }

  if (company.data.website) {
    data.website = company.data.website
  }

  if (company.data.email) {
    data.email = company.data.email.toLowerCase()
  }

  if (company.data.phone1) {
    data.phone = company.data.phone1
  }

  if (visitingaddress && visitingaddress.street) {
    data.address_visiting = `${visitingaddress.street}${visitingaddress.housenumber ? ` ${visitingaddress.housenumber}${visitingaddress.additionhousenumber ? ` ${visitingaddress.additionhousenumber}` : ''}` : ''}`
  }
  if (postaladdress && postaladdress.street) {
    data.address_postal = `${postaladdress.street}${postaladdress.housenumber ? ` ${postaladdress.housenumber}${postaladdress.additionhousenumber ? ` ${postaladdress.additionhousenumber}` : ''}` : ''}`
  }

  return data
}

module.exports = {
  formatCompanyData
}
