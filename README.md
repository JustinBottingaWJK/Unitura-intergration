# Bright Digital HubSpot Integration Boilerplate

## Table of contents

---

1. [Credits](#credits)
2. [About](#about)
3. [Project overview](#project-overview)
4. [Getting started](#getting-started)
5. [How it works](#how-it-works)
6. [Retrieving data](#retrieving-data)
7. [Documentation](#documentation)

## Credits

---

This boilerplate is made by **Teun Rutten** commissioned for [Bright Digital](https://www.brightdigital.com) with the pure intention of using it as a project set-up for HubSpot public app integrations and speeding up the process of building one by doing so.

This readme file is made by **Maurice ten Teije** and the structure is based on the [Bright Digital HubSpot Development Boilerplate](https://bitbucket.org/bureau_bright/bright-databank) made by **Linsey Brander** & **Teun Rutten**.

## About

---

This Boilerplate consists a project set-up for a public app integration that includes:

- Installing the app to a HubSpot portal through [OAuth authorization](https://developers.hubspot.com/docs/api/working-with-oauth) with a clientId and a scope.
  - Exchanging the payload for an access token and a refresh token.
  - Storing the returned tokens in a [PostgreSQL](https://www.postgresql.org/) database.
- Setting up a [node.js](https://nodejs.org/en/) and [express](https://expressjs.com/) app that listens to [CRUD requests](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) on custom endpoints.
  - Retrieving tokens from the PostgreSQL database based on the portalId.
  - Using these tokens to make a GET request with [Axios](https://www.npmjs.com/package/axios) to the [HubSpot API](https://developers.hubspot.com/docs/api/crm/properties) to get all contacts in the current portal.

## Project overview

This project shows how to install a public app to a portal through OAuth authorization, how to create an app that listens to CRUD requests fired at an endpoint and how to make a GET request to the HubSpot API with tokens stored to a PostgreSQL database. 

### Project structure

- An `app` folder that includes the code of this project:
  - A `database` directory containing code to create a PostgreSQL database and store, update and 
  retrieve tokens.
  - A `hubspot` directory containing code for authorization:
    - An `auth` directory containing code to authorize the app by exchanging tokens.
  - An `index.js` file containing code for the main code including saving variables, importing dependencies, setting up routes and making a requests to the HubSpot API.
- A `.gitignore` file that excludes node_modules from being pushing to a [git](https://github.com/) repository. 
- A `package.json` file containing the dependencies.
- A `Procfile` file containing code to determine which command to execute for the [Heroku](https://dashboard.heroku.com/) app.
- A `README.md` file containing a detailed explanation about this project. 

## Getting started

---

### Requirements

A few things must be set-up before you can make use of this Integration Boilerplate:

- You must have an active [HubSpot Developer account](https://developers.hubspot.com/get-started) to create a HubSpot public app
- You must have [node.js](https://nodejs.org/en/) installed.
- You must have [express.js](https://expressjs.com/) installed.
  - You can install both by entering the CLI command `yarn install` and installing all the dependencies included in the `package.json`.
- You must have access to the [Bright Digital BitBucket workspace](https://bitbucket.org/bureau_bright/).
- You must have [Git](https://git-scm.com/downloads) installed to push your local changes to either the Bitbucket repository or optionally the Heroku App. 

**Optional:**

- You must have a [Heroku account](https://id.heroku.com/login) and atleast the Eco subscription to get dynos and attach the PostgreSQL database.
  - You can run your app locally, but to deploy it externally you would need to create a Heroku App.

### App set-up

Once you've completed the prerequisites, you can start creating a HubSpot App and integration based on this project.

**1. Creating a public HubSpot app:**

- Log into your HubSpot Developer account and navigate to 'Apps' in the menu in the top left corner. 
- Click on 'Create app' in the top right corner.
- Enter a public app name.

**2. Enter the HubSpot app Auth information:**

If you haven't set-up a Redirect URL in your integration yet, come back to this step once you have.

- Click on the tab 'Auth': Here you'll be able to access the App ID, Client ID and Client secret which you need later on, as well as the possibility to set your Install URL (OAuth), Redirect URL(s) and scope. 
- Enter the Redirect URL(s). The Install URL (OAuth) should automatically be set now. 
- Enter the desired scope of the app. 

## How it works

---

### Express

---

This project uses Express for building the application. It is a Node.js web application framework that provides multiple features for building an application and is an extra layer on top of the Node.js that helps manage servers and routes.

If you're using the current project, install the required dependencies by entering the 'npm install' CLI command into your terminal. 
If you're setting up a new project, [install](https://expressjs.com/en/starter/installing.html) Express directly into your dependencies by entering the 'npm install express' CLI command into your terminal.

At the top of your JavaScript file (in this project the index.js in the App directory), require the dependency:
```
const express = require('express');
```

Then initialize a new app:
```
const app = express();
```

You can make the app listen to your local host for testing purposes:
```
app.listen(process.env.PORT || 3000, () => {
	console.log(`Gripp Integration listening at http://localhost:${process.env.PORT}`)
})
```
The process.env.PORT is a global variable loaded from Heroku, more on this later.

You can create an endpoint for testing purposes that listens to GET requests:
```
app.get('/', async (req, res) => {
  console.log('test);
});
```

Execute the JavaScript file (index.js in this case) in your terminal by entering the CLI command 'node index.js'.
Now you can access the endpoint by navigating to the localhost in your browser, assuming you're not using Heroku. If you do, you can host the app on Heroku by specifying the index.js in the Procfile.

### OAuth

---

Create an endpoint with a href that let's the user redirect to the install endpoint from the 'homepage' of the app:
```
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h2>HubSpot OAuth 2.0 Quickstart App</h2>`);
  res.write(`<a href="/install"><h3>Install the app</h3></a>`);
  res.end();
});
```

The endpoint /install is now being called from the href the user clicked on:
```
router.get('/install', (req, res) => {
  console.log('Initializing new HubSpot install')
  res.redirect(authUrl);
});
```

This endpoint will redirect the user to the set authURL, which is a variable taken from the HubSpot public app Auth settings, based on the app credentials, redirect URL, and scope configuration.

```
const authUrl =
  `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=hubdb%20crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.schemas.contacts.write`;
```

```
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_ID = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = `https://quoratio-crm-card.herokuapp.com/auth/oauth-callback`
```

The `CLIENT_ID`, `CLIENT_ID` and `REDIRECT_URI` are environment variables set in the Heroku app:

- Navigate to the [Heroku website](https://dashboard.heroku.com/apps) and log into your account. 
- Navigate to your dashboard and select your app. 
- In the menu at the top, select the 'Settings' tab. 
- At the 'Config Vars', select 'Reveal Config Vars' (if they are unrevealed) and enter the HubSpot App's Client ID and Client secret. 

The authUrl will call the /oauth-callback endpoint from HubSpot:
```
app.get('/oauth-callback', async (req, res) => {
  console.log('User has been prompted to install the integration, exchanging auth code for tokens')
  if (req.query.code) {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('code', req.query.code);

    const token = await exchangeTokens(null, params, client);
    console.log(`Access token is ${token}`)
    if (token.message) {
      console.error(`Error while retrieving tokens: ${token.message}`)
      return res.redirect(`/error?msg=${token.message}`);
    }
    
    return res.redirect(`/success`);
  }
});
```

Here, the code from the request query and the `grant type`, `client id`, `client secret` and `redirect uri` will be appended to a new `URLSearchParams()` variable. 

Before the exchangeTokens() method is being called, we need to create a client which will be passed as an argument in this method:

```
const { Client } = require('pg');

const createClient = () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  client.connect();

  return client
}
```

This client is connected to a Postgres database, of which the Database URL has also been set as a Heroku environment variable. This database can be attached as an add-on at the 'Resources' tab in Heroku. 

The exchangeTokens() method is being called, including the params variable that have been made in the previous step and the client:

```
const axios = require('axios');
const { storeTokens } = require('../../database/')
const { getCurrentPortal } = require('../')

const exchangeTokens = async (currentPortalId, exchangeProof, client) => {
  console.log(`Exchanging tokens with HuBD`)
  return await axios({
    method: 'post',
    url: 'https://api.hubapi.com/oauth/v1/token',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    },
    data: exchangeProof
  }).then(async (response) => {
    const tokens = response.data
    const portalId = currentPortalId ? currentPortalId : await getCurrentPortal(tokens.access_token)

    if (portalId) {
      const result = await storeTokens(tokens, portalId, client)
      if (result) {
        return {
          accessToken: tokens.access_token,
          portalId: portalId
        }
      } else {
        console.log('Could not store tokens')
      }
    } else {
      console.log(`Could not get the portal ID, no way to store tokens`)
      return false
    }
  }).catch((error) => {
    console.log(error)
  })
}
```

In this method, the HubSpot API will be called to exchange the credentials for an `access token` and a `refresh token`. This access token will then be used to retrieve the current `portal Id`. If the `portal id` is successfully retrieved, the tokens and portalId will then be stored in the PostgreSQL database: 

```
const storeTokens = async (tokens, portalId, client) => {
  console.log('Checking if PostgresQL table is present')
  const table = await createTable(client)

  if (table) {
    console.log('Table is present, storing tokens')
    return await client.query('INSERT INTO hubtokens(portal_id, access_token, refresh_token, expires_in, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING *', 
    [portalId, tokens.access_token, tokens.refresh_token, tokens.expires_in, new Date()]).then((response) => {
      console.log(`Succesfully stored tokens: ${response}`)
      return tokens
    }).catch(async e => {
      console.log(e.constraint)
      if (e.constraint === 'hubtokens_portal_id_key') {
        console.log(`Record with ${portalId} already exists, updating record instead`) 
        const result = await updateTokens(tokens, portalId, client)
        return tokens
      } else {
        console.error(`Error while storing tokens: ${e.stack}`)
        return false
      }
    })
  } else {
    console.log('Table is not present, could not store tokens')
    return false
  }
}
```

The `createTable()` method will be called to create a table if there isn't an existing one linking to the same data. Then, the data will be inserted into the table and if a record with the same portal Id already exists, it will be updated by calling the `updateTokens()` method.

If everything is sucessfully executed, the /oauth-callback endpoint will redirect the user to the /success endpoint which displays a message that everything went according to plan and you may close the page.

```
router.get('/success', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Succesfully installed integration, you can close the page</h4>`);
  res.end();
})
```

The installation should now be successfully completed.

## Retrieving data

---

Since we can now retrieve an `access token`, we can use it to authorize to the HubSpot API and retrieve data through an `Axios` request. In the following example, we will create a GET requests and call the HubSpot API to retrieve contact data:

```
const getContact = async (accessToken) => {
  console.log('Retrieving contact from HubSpot');
  try {
    const result = await axios({
      method: 'get',
      url: 'https://api.hubapi.com/contacts/v1/lists/all/contacts/all?count=1',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.data
    }).catch((error) => {
      console.log(error)
    })

    return result.contacts[0];
  } catch (e) {
    return e;
  }
};
```

## Documentation

### Overview
- [Project overview](https://developers.hubspot.com/docs/api/private-apps)

### Setup
- [BitBucket repository](https://bitbucket.org/bureau_bright/bright-databank)
- [HubSpot Developer account](https://developers.hubspot.com/get-started)
- [OAuth authorization](https://developers.hubspot.com/docs/api/working-with-oauth)
- [Heroku](https://devcenter.heroku.com/categories/reference)
- [PostgreSQL](https://www.postgresql.org/)

### API
- [HubSpot API reference documentation](https://developers.hubspot.com/docs/api/crm/properties)
- [CRUD requests](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)

### Dependencies
- [Node.js](https://nodejs.org/en/)
- [Express.js](https://expressjs.com/)
- [Postgres](https://www.npmjs.com/package/pg)
- [Axios](https://www.npmjs.com/package/axios)

