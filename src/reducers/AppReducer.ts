import { combineReducers } from 'redux';
import { ContentReducer, ContentReducerState } from './ContentReducer';
// import { EducatorReducer, EducatorReducerState } from './EducatorReducer';
import { EnvironmentReducer, EnvironmentReducerState } from './EnvironmentReducer';

export type AppReducerState = {
    readonly environment: EnvironmentReducerState,
    readonly content: ContentReducerState,
}

export const AppReducer = combineReducers({
    environment: EnvironmentReducer,
    content: ContentReducer,
});
