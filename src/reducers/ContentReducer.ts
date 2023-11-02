import { PayloadAction } from "@reduxjs/toolkit";
import { Rect } from "../utils/geometry";

// copied from api
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

// copied from the api
interface TableTop {
  _id: string;
  user: string;
  scene?: string;
}

export type ContentReducerState = {
  readonly pushTime: number | undefined;
  readonly currentScene?: Scene;
  readonly scenes: Scene[];
};

const initialState: ContentReducerState = {
  pushTime: undefined,
  currentScene: undefined,
  scenes: [],
}

export const ContentReducer = (state = initialState, action: PayloadAction) => {
  switch(action.type) {
    case 'content/push':
      return { ...state, pushTime: action.payload };
    case 'content/pull':
      const table: TableTop = (action.payload as unknown) as TableTop;
      const tableSceneIdx = state.scenes.findIndex(s => s._id === table.scene);
      if (tableSceneIdx < 0) {
        console.error(`Unable to find scene ${table.scene} in ${JSON.stringify(state.scenes)}`);
        return state;
      }
      return  {...state, currentScene: state.scenes[tableSceneIdx]}
    case 'content/zoom':
      return {...state, scene: ((action.payload as unknown) as Scene) };
    case 'content/scenes': {
      const scenes: Scene[] = (action.payload as unknown) as Scene[];
      // TODO DONT SET DEFUALT
      return {...state, scenes: scenes, currentScene: scenes[0]};
    }
    case 'content/scene': {// load an updated or new scene
      const scene: Scene = (action.payload as unknown) as Scene;
      const idx = state.scenes.findIndex(s => s._id === scene._id);
      if (idx < 0) return {...state, scenes: [...state.scenes, scene], currentScene: scene};
      state.scenes.splice(idx, 1, scene); // remember this changes inline, hence absense from return
      // we don't want to rerender if we are just swappign in new contents
      return {...state, scenes: state.scenes, currentScene: scene};
    }
    case 'content/deletescene': {
      const scene: Scene = (action.payload as unknown) as Scene;
      const scenes = state.scenes.filter(s => s._id !== scene._id);
      return {...state, scenes: scenes, currentScene: scene};
    }
    case 'content/currentscene':{
      const scene: Scene = (action.payload as unknown) as Scene;
      return { ...state, currentScene: scene};
    }
    default:
      return state;
    }
}
