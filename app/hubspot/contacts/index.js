const { handleContacts } = require('./handleContacts')
const { searchContacts } = require('./searchContacts')
const { createContact } = require('./createContact')
const { retrieveOrCreateContact } = require('./retrieveOrCreateContact')

module.exports = {
  handleContacts,
  searchContacts,
  createContact,
  retrieveOrCreateContact
}