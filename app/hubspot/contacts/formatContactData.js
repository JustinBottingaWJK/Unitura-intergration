const formatContactData = async (contact, person, isProject) => {
  const data = {
    ridder_id: contact.data.id,
    sync_timestamp: new Date(),
    email: contact.data.email?.toLowerCase() || '',
  }

  if (person.firstname) {
    data.firstname = person.firstname
  }

  if (person.initials) {
    data.initials = person.initials
  }

  if (person.lastname) {
    data.lastname = `${person.nameprefix ? person.nameprefix + ' ' : ''}${person.lastname}`
  }

  if (contact.data.cellphone) {
    data.mobilephone = contact.data.cellphone
  }

  return data
}

module.exports = {
  formatContactData
}