import { PayloadAction } from "@reduxjs/toolkit";
import { AuthState } from "../utils/auth";
import { Auth0Client } from "@auth0/auth0-spa-js";

export type EnvironmentReducerState = {
  readonly api: string | undefined;
  readonly ws: string | undefined;
  readonly client: Auth0Client | undefined
  readonly auth: boolean;
};

const initialState: EnvironmentReducerState = {
  api: undefined,
  ws: undefined,
  client: undefined,
  auth: false,
}

export const EnvironmentReducer = (state = initialState, action: PayloadAction) => {
	switch(action.type) {
		case 'environment/config': {
			if (action.payload != null && ('data' in action.payload)) {
				if ('API_URL' in action.payload['data'] && 'WS_URL' in action.payload['data']) {
					return {...state, api: action.payload['data']['API_URL'], ws: action.payload['data']['WS_URL']}
				} else {
          console.error(`environment/config payload missing API_URL or WS_URL`);
        }
			}
			return state;
		}
    case 'environment/authenticate': {
      if (action.payload === null) return state;
      const authState: AuthState = (action.payload as unknown) as AuthState;
      return {...state, auth: authState.auth, client: authState.client};
    }
		default:
			return state;
	}
}