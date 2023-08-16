import { Auth0Client, createAuth0Client } from "@auth0/auth0-spa-js";
import { AnyAction, Dispatch, MiddlewareAPI } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * Step 1 - get your authentication configuraiton
 * @param store 
 * @param next 
 * @returns 
 */
export function getAuthConfig(store: MiddlewareAPI<Dispatch<AnyAction>>, next: Dispatch<AnyAction>): Promise<any> {
  return new Promise((resolve, reject) => {
    const auth = store.getState().auth;
    if (auth) return resolve(auth);
    axios.get("/auth.json").then(data => {
      next({type: 'environment/auth', paylaod: data.data});
      return resolve(data.data);
    }).catch(err => reject(err));
  });
}

/**
 * Step 2 - create an authentication client.
 * @param data 
 * @returns 
 */
export function getAuthClient(data: any): Promise<Auth0Client> {
  return new Promise((resolve, reject) => {
    createAuth0Client(data).then(client => resolve(client))
      .catch(reason => reject(reason));
  })
}

/**
 * Step 3 - trigger login OR handle callback
 * @param client 
 * @returns 
 */
export function authenticateClient(client: Auth0Client): Promise<Auth0Client> {
  return new Promise((resolve, reject) => {
    client.isAuthenticated().then(authn => {
      const query = window.location.search;

      // if we're alread authenticated we can just go get a token
      if (authn) return resolve(client);

      // if we have a auth code callback handle it
      if (query.includes("code=") && query.includes("state="))
        return client.handleRedirectCallback(window.location.href)
          .then(() => resolve(client))
          .catch(reason => reject(reason));

      // force redirect to log in
      const options = {authorizationParams: {redirect_uri: window.location.href}};
      return client.loginWithRedirect(options).then(() => resolve(client))
        .catch(reason => reject(reason));
    });
  });
}

/**
 * Step 4 - profit!
 * @param client 
 * @returns 
 */
export function getToken(client: Auth0Client) {
  return new Promise((resolve, reject) => {
    client.getTokenSilently().then(value => resolve(value))
      .catch(err => reject(err));
  });
}