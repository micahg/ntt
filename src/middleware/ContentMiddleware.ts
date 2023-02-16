import { Middleware, StateFromReducersMapObject } from 'redux';
import axios from 'axios';
import { blob } from 'stream/consumers';
import { AppReducerState } from '../reducers/AppReducer';

export const ContentMiddleware: Middleware = storeAPI => next => action=> {
  switch (action.type) {
    case 'content/overlay': {
      let blob: Blob = action.payload;
      let state: AppReducerState = storeAPI.getState();
      if (!state.environment.api) {
        console.error(`UNABLE TO GET API FROM STATE`);
        return;
      }

      let url: string = `${state.environment.api}/asset`;
      if (blob) {
        let formData = new FormData();
        formData.append('image', blob);
        axios.put(url, formData, { headers: { 'Content-Type': blob.type }}).then(value => {
          console.log(`I did send ${JSON.stringify(value)}`);
          return next(action);
        }).catch(err => console.error(`Unable to update overlay: ${JSON.stringify(err)}`))
      } else {
        axios.get(url).then(value => {
          action.payload = new Blob([value.data], {type: value.headers['content-type']});
          return next(action);
        }).catch(err => console.error(`Unable to get overlay: ${JSON.stringify(err)}`));
      }
      break;
    }
    default:
      return next(action);
  }
}