const compareContacts = async (contacts, hsContacts) => {
  const contactsToUpdate = [];
  const contactsToCreate = [];

  for (const contact of contacts) {
    const hsContact = await hsContacts.find((hsContact) => hsContact.properties.email == contact.email);

    if (hsContact) {
      contactsToUpdate.push({
        id: hsContact.id,
        data: contact
      });
    } else {
      contactsToCreate.push({
        data: contact
      });
    }
  }

  return {
    contactsToUpdate: contactsToUpdate,
    contactsToCreate: contactsToCreate
  }
}

module.exports = {
  compareContacts
}