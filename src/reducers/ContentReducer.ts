import { PayloadAction } from "@reduxjs/toolkit";
import { Rect } from "../utils/geometry";

// TODO THIS IS COPIED ..> FIND A BETTER WAY
// ALSO MICAH THIS DOESN'T SEEM TO BE USED NOW THAT
// SCENE HAS VIEWPORT, BG and OVERLAY
interface TableState {
  overlay?: string;
  background?: string;
  viewport?: Rect;
}

export interface Scene {
  _id?: string,
  user: string;
  description: string;
  overlayContent?: string;
  userContent?: string;
  tableContent?: string;
  viewport?: Rect;
  backgroundSize?: Rect;
}

export type ContentReducerState = {
  readonly overlay: string | Blob | undefined; // MICAH UNUSED?
  readonly background: string | undefined; // MICAH UNUSED?
  readonly viewport: Rect | undefined; // MICAH UNUSED?
  readonly pushTime: number | undefined;
  readonly currentScene?: Scene;
  readonly scenes: Scene[];
};

const initialState: ContentReducerState = {
  overlay: undefined,
  background: undefined,
  pushTime: undefined,
  viewport: undefined,
  currentScene: undefined,
  scenes: [],
}

export const ContentReducer = (state = initialState, action: PayloadAction) => {
  switch(action.type) {
    case 'content/push':
      return { ...state, pushTime: action.payload };
    case 'content/pull':
      let tableState: TableState = (action.payload as unknown) as TableState;
      return {...state, background: tableState.background, overlay: tableState.overlay}
    case 'content/overlay':
      return {...state, overlay: action.payload };
    case 'content/background':
      return {...state, background: action.payload};
    case 'content/zoom':
      const x = {...state, scene: ((action.payload as unknown) as Scene) };
      return x;
    case 'content/scenes':
      const scenes: Scene[] = (action.payload as unknown) as Scene[];
      // TODO DONT SET DEFUALT
      return {...state, scenes: scenes, currentScene: scenes[0]};
    case 'content/scene':
      const scene: Scene = (action.payload as unknown) as Scene;
      const idx = state.scenes.findIndex(s => s._id === scene._id);
      const newScenes = state.scenes;
      newScenes.splice(idx, 1, scene);
      return {...state, scenes: newScenes, currentScene: scene};
    default:
      return state;
    }
}