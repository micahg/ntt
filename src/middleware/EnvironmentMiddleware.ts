import { AuthState, getAuthClient, getAuthConfig, getAuthState, getDeviceCode, pollDeviceCode } from '../utils/auth';
import { Middleware } from 'redux';
import axios from 'axios';

export const EnvironmentMiddleware: Middleware = storeAPI => next => action => {
  if (action.type === 'environment/config') {
    axios.get('/env.json')
      .then(data => {
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
    })
    .then(() => getAuthConfig(storeAPI))
    .then(data => next({type: 'environment/authconfig', payload: data}))
    .then(() => getAuthClient(storeAPI))
    .then(client => next({type: 'environment/authclient', payload: client}))
    .catch(reason => {
      // TODO trigger an error
      console.error(`FAILED TO ENV CONFIG FETCH ${JSON.stringify(reason)}`)
    });
  } else if (action.type === 'environment/authenticate') {
    if (storeAPI.getState().environment.authStarted) return next(action);
    next({type: 'environment/authstarted', payload: true});

    getAuthState(storeAPI.getState().environment.authClient)
      .then(state => next({type: action.type, payload: state}))
      .catch(err => {
        if (err === "noauth") {
          console.warn('Authentication explicitly disabled at server');
          const authState: AuthState = {auth: false, noauth: true};
          return next({type: action.type, payload: authState})
        }
        console.error(`UNABLE TO AUTHENTICATE: ${JSON.stringify(err)}`);
        return next(action);
      });
  } else if (action.type === 'environment/logout') {
    getAuthClient(storeAPI)
      .then(client => client.logout())
      .then(() => console.log('Successfully logged out'))
      .catch(err => console.error(`UNABLE TO LOG OUT: ${JSON.stringify(err)}`));
  } else if (action.type === 'environment/devicecode') {
    if (storeAPI.getState().environment.authStarted) return next(action);
    next({type: 'environment/authstarted', payload: true});

    getAuthConfig(storeAPI)
      .then(data => getDeviceCode(data))
      .then(value => next({'type': action.type, 'payload': value}))
      .catch(err => console.error(`Device Code Authentication Failed: ${JSON.stringify(err)}`))
  } else if (action.type === 'environment/devicecodepoll') {
    pollDeviceCode(storeAPI)
      .then(data => next({type: action.type, payload: data}))
      .catch(err => console.error(`Device code fetch failed: ${JSON.stringify(err)}`));
  } else {
    return next(action);
  }
}