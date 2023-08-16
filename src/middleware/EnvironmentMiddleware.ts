import { Middleware } from 'redux';
import axios from 'axios';
import { authenticateClient, getAuthClient, getAuthConfig, getToken } from '../utils/auth';

export const EnvironmentMiddleware: Middleware = storeAPI => next => action => {
  if (action.type === 'environment/config') {
    axios.get('/env.json').then(data => {
      action.payload = data;

      // small hack here for when we're running in combined docker.
      // saas images will have non localhost values returned by through a
      // k8s config map. Otherwise, if we're running on some non-localhost
      // value with our API_URL configured to localhost, just use combined
      // protocol/host/port as the base (for the combined docker image)
      const infApiUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
      if (action.payload.data.API_URL === "http://localhost:3000" && window.location.hostname !== 'localhost') {
        action.payload.data.API_URL = infApiUrl;
      }

      // same goes for webservices - as above so below
      const infWSUrl = `ws://${window.location.hostname}:${window.location.port}`
      if (action.payload.data.WS_URL === "ws://localhost:3000/" && window.location.hostname !== 'localhost') {
        action.payload.data.WS_URL = infWSUrl;
      }

      return next(action);
    }).catch(reason => {
      // TODO trigger an error
      console.error(`FAILED TO ENV CONFIG FETCH ${JSON.stringify(reason)}`)
    });
  } else if (action.type === 'environment/logout') {
    getAuthConfig(storeAPI, next)
      .then(data => getAuthClient(data))
      .then(client => client.logout())
      .then(() => console.log('Successfully logged out'))
      .catch(err => console.error(`UNABLE TO LOG OUT: ${JSON.stringify(err)}`));
  } else if (action.type === 'environment/token') {
    // OI DO NOT CHANGE THIS - getToken *silently* gets the token, which includes
    // refreshing when old ones expire
    getAuthConfig(storeAPI, next)
      .then(data => getAuthClient(data))
      .then(client => authenticateClient(client))
      .then(client => getToken(client))
      .then(token => next({type:'environment/token', payload:token}))
      .catch(reason => {
        console.error(`UNABLE TO LOG IN: ${JSON.stringify(reason)}`)
        next(action);
      });
  } else {
    return next(action);
  }
}