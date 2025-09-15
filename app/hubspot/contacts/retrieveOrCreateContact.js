const { createContact } = require('./createContact')
const { getContactByEmail } = require('./getContactByEmail')
const { getContact } = require('../../ridder/contacts')
const { getPerson } = require('../../ridder/persons')

const retrieveOrCreateContact = async (contactId, isProject, relationId, companyToAssociate, limiter, searchLimiter) => {
  let contactToAssociate = false
  const contact = await getContact(contactId, isProject) 

  if (contact) {
    contactToAssociate = await getContactByEmail(contact.email, limiter);

    if (contactToAssociate) {
      console.log(`Succesfully found contact with Ridder ID: ${contactId} in HubSpot to associate with the deal`)
    } else {
      console.log(`No contact found with Ridder ID: ${contactId} in HubSpot, creating new contact`)
      const person = await getPerson(contact.person.id, isProject)
  
      if (person) {
        // Check if the relation ID is the same for both the deal and contact, if so, associate the company in HubSpot that we have created from the deal flow
        companyToAssociate = relationId && relationId == contact.relation.id ? companyToAssociate : false
        contactToAssociate = await createContact({ data: contact }, person, companyToAssociate, isProject, limiter);
      }
    }
  } else {
    console.log(`Contact with Ridder ID: ${contactId} not found in Ridder`)
  }

  return contactToAssociate
}

module.exports = {
  retrieveOrCreateContact
}