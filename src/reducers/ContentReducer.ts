import { PayloadAction } from "@reduxjs/toolkit";

export type ContentReducerState = {
    readonly overlay: Blob | undefined;
};

const initialState: ContentReducerState = {
    overlay: undefined,
}

export const ContentReducer = (state = initialState, action: PayloadAction) => {
    switch(action.type) {
        case 'content/overlay': {
            let x = typeof action.payload;
            return {...state, overlay: action.payload }
        }
        default:
            return state;
    }
}