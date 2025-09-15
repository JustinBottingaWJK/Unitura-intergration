const { searchContacts } = require('./searchContacts')
const { compareContacts } = require('./compareContacts')
const { updateContact } = require('./updateContact')
const { getPerson } = require('../../ridder/persons')

const handleContacts = async (contacts, isProject, limiter, searchLimiter) => {
  return new Promise(async (resolve, reject) => {
    if (contacts.length > 0) {
      console.log(`We have ${contacts.length} contacts to process`)

      // Make sure we do not try to handle more than 90 contacts at a time
      const chuncks = await contacts.reduce((all, one, i) => {
        const ch = Math.floor(i / 90); 
        all[ch] = [].concat((all[ch] || []), one); 
        return all
      }, [])

      for (const chunck of chuncks) {
        console.log(`Handling ${chunck.length} contacts of total ${contacts.length} contacts`)
        const hsContacts = await searchContacts(chunck, limiter, searchLimiter);

        if (hsContacts === false) {
          console.log('Error while searching for contacts in HubSpot')
          continue;
        }

        const contactsToCRUD = await compareContacts(chunck, hsContacts);
        console.log(`We have ${contactsToCRUD.contactsToUpdate.length} contacts to update and ${contactsToCRUD.contactsToCreate.length} contacts that do not have to be created in HubSpot`)
        
        if (contactsToCRUD.contactsToUpdate.length > 0) {
          console.log(`Updating ${contactsToCRUD.contactsToUpdate.length} contacts in HubSpot`);
          for (const contact of contactsToCRUD.contactsToUpdate) {
            const person = await getPerson(contact.data.person.id, isProject)
            const contactId = await updateContact(contact, person, isProject, limiter)
          }
        }
      }

      resolve(true)
    } else {
      console.log('No contacts to process')
      resolve(true)
    }
  })
}

module.exports = {
  handleContacts
}