import React, { RefObject, createRef, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';
import { getRect } from '../../utils/drawing';
import { getWidthAndHeight } from '../../utils/geometry';
import { MouseStateMachine } from '../../utils/mousestatemachine';
import { setCallback } from '../../utils/statemachine';
import styles from './ContentEditor.module.css';
import { RotateRight, Opacity, ZoomIn, ZoomOut, LayersClear, Sync, Map, Palette, VisibilityOff, Visibility } from '@mui/icons-material';
import { GameMasterAction } from '../GameMasterActionComponent/GameMasterActionComponent';
import { Box, Menu, MenuItem, Popover, Slider } from '@mui/material';
import { setupOffscreenCanvas } from '../../utils/offscreencanvas';

const sm = new MouseStateMachine();

interface ContentEditorProps {
  populateToolbar?: (actions: GameMasterAction[]) => void;
  redrawToolbar?: () => void;
  manageScene?: () => void;
}

// hack around rerendering -- keep one object in state and update properties
// so that the object itself remains unchanged.
interface InternalState {
  color: RefObject<HTMLInputElement>;
  obscure: boolean;
  zoom: boolean;
  angle: number;
}

const ContentEditor = ({populateToolbar, redrawToolbar, manageScene}: ContentEditorProps) => {
  const dispatch = useDispatch();
  const contentCanvasRef = createRef<HTMLCanvasElement>();
  const overlayCanvasRef = createRef<HTMLCanvasElement>();
  const fullCanvasRef = createRef<HTMLCanvasElement>();
  const colorInputRef = createRef<HTMLInputElement>();
  
  const [internalState, ] = useState<InternalState>({zoom: false, obscure: false, color: createRef(), angle: 0});
  const [showBackgroundMenu, setShowBackgroundMenu] = useState<boolean>(false);
  const [showOpacityMenu, setShowOpacityMenu] = useState<boolean>(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState<boolean>(false);
  const [backgroundSize, setBackgroundSize] = useState<number[]|null>(null); 
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bgRev, setBgRev] = useState<number>(0);
  const [ovRev, setOvRev] = useState<number>(0);
  const [sceneId, setSceneId] = useState<string>(); // used to track flipping between scenes
  const [worker, setWorker] = useState<Worker>();
  const [canvassesTransferred, setCanvassesTransferred] = useState<boolean>(false); // avoid transfer errors

  /**
   * THIS GUY RIGHT HERE IS REALLY IMPORTANT. Because we use a callback to render
   * this components actions to another components toolbar, we will get rerendered
   * more thatn we want.
   *
   * To avoid rerendering we start with this flag false until we've triggered and
   * ensure any relevant useEffect calls depend on its truth.
   */
  const [toolbarPopulated, setToolbarPopulated] = useState<boolean>(false);

  const auth = useSelector((state: AppReducerState) => state.environment.auth);
  const noauth = useSelector((state: AppReducerState) => state.environment.noauth);
  const scene = useSelector((state: AppReducerState) => state.content.currentScene);
  const apiUrl = useSelector((state: AppReducerState) => state.environment.api);
  const pushTime = useSelector((state: AppReducerState) => state.content.pushTime);

  const updateObscure = useCallback((value: boolean) => {
    if (internalState.obscure !== value && redrawToolbar) {
      internalState.obscure = value;
      redrawToolbar();
    }
  }, [internalState, redrawToolbar]);

  const sceneManager = useCallback(() => {if (manageScene) manageScene(); }, [manageScene]);

  const rotateClockwise = useCallback(() => {
    if (!worker) return;
    internalState.angle = (internalState.angle + 90) % 360;
    worker.postMessage({cmd: 'rotate', angle: internalState.angle});
  }, [internalState, worker])

  const gmSelectColor = () => {
    if (!internalState.color.current) return;
    const ref = internalState.color.current;
    ref.focus();
    ref.click();
  }

  const gmSelectOpacityMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    sm.transition('opacity')
  }

  /**
   * Handle opacity menu selection.
   * @param option "display" or "render"
   */
  const gmSelectOpacityOption = (option: string) => {
    setShowOpacityMenu(false);
    sm.transition(option);
  }

  const gmSetOpacity = (event: Event, newValue: number | number[]) => sm.transition('change', newValue as number);

  const gmCloseOpacitySlider = () => {
    setShowOpacitySlider(false);
    setAnchorEl(null);
    sm.transition('wait');
  }

  const setOverlayColour = (colour: string) => {
    if (!worker) return;
    const [red, green, blue] = [parseInt(colour.slice(1, 3), 16).toString(),
                          parseInt(colour.slice(3, 5), 16).toString(),
                          parseInt(colour.slice(5, 7), 16).toString()];
    worker.postMessage({cmd: 'colour', red: red, green: green, blue: blue});
  }

  const selectOverlay = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    if (!worker) return;
    worker.postMessage({cmd: 'record', x1: x1, y1: y1, x2: x2, y2: y2});
  }, [worker]);

  /**
   * This method doesn't have access to the updated component state *BECAUSE*
   * its 
   */
  const handleWorkerMessage = useCallback((evt: MessageEvent<any>) => {
    // bump the overlay version so it gets sent
    if (evt.data.cmd === 'overlay') {
      setOvRev(ovRev + 1);
      dispatch({type: 'content/overlay', payload: evt.data.blob})
    } else if (evt.data.cmd === 'viewport') {
      dispatch({type: 'content/zoom', payload: {'viewport': evt.data.viewport}});
    } else if (evt.data.cmd === 'initialized') {
      // MICAH update background and vp here if the  scene does not have it.
      // const [w, h] = [evt.data.fullWidth, evt.data.fullHeight];
      setBackgroundSize([evt.data.width, evt.data.height]);

      // if (scene) {

      //   // TODO MICAH move this so somewhere we have the scene.
      //   const vp: ViewportBundle = {};
  
      //   // if the actual viewport is missing or has inaccurate width and height, update
      //   if (!scene?.viewport || scene.viewport.width !== w || scene.viewport.height !== h) {
      //     vp.viewport = {x: 0, y: 0, width: w, height: h};
      //   }
      //   if (!scene?.backgroundSize || scene.backgroundSize.width !== w || scene.backgroundSize.height !== h) {
      //     vp.backgroundSize = {x: 0, y: 0, width: w, height: h};
      //   }
      //   if (vp.viewport || vp.backgroundSize) dispatch({type: 'content/zoom', payload: vp});
      // }
    }
  }, [dispatch, ovRev]);

  useEffect(() => {
    if (!internalState || !toolbarPopulated) return;
    internalState.color = colorInputRef
  }, [internalState, colorInputRef, toolbarPopulated]);

  /**
   * Populate the toolbar with our actions. Empty deps insures this only gets
   * called once on load.
   */
  useEffect(() => {
    if (!populateToolbar) return;

    const actions: GameMasterAction[] = [
      { icon: Sync,          tooltip: "Sync Remote Display",       hidden: () => false,               disabled: () => false,                  callback: () => sm.transition('push') },
      { icon: Map,           tooltip: "Scene Backgrounds",         hidden: () => false,               disabled: () => false,                  callback: sceneManager },
      { icon: Palette,       tooltip: "Color Palette",             hidden: () => false,               disabled: () => false,                  callback: gmSelectColor },
      { icon: LayersClear,   tooltip: "Clear Overlay",             hidden: () => false,               disabled: () => internalState.obscure,  callback: () => sm.transition('clear')},
      { icon: VisibilityOff, tooltip: "Obscure",                   hidden: () => false,               disabled: () => !internalState.obscure, callback: () => sm.transition('obscure')},
      { icon: Visibility,    tooltip: "Reveal",                    hidden: () => false,               disabled: () => !internalState.obscure, callback: () => sm.transition('reveal')},
      { icon: ZoomIn,        tooltip: "Zoom In",                   hidden: () => internalState.zoom,  disabled: () => !internalState.obscure, callback: () => sm.transition('zoomIn')},
      { icon: ZoomOut,       tooltip: "Zoom Out",                  hidden: () => !internalState.zoom, disabled: () => false,                  callback: () => sm.transition('zoomOut')},
      { icon: Opacity,       tooltip: "Opacity",                   hidden: () => false,               disabled: () => internalState.obscure,  callback: (evt) => gmSelectOpacityMenu(evt)},
      { icon: RotateRight,   tooltip: "Rotate",                    hidden: () => false,               disabled: () => internalState.obscure,  callback: () => sm.transition('rotateClock')},
    ];
    populateToolbar(actions);
    setToolbarPopulated(true);
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scene || !scene.viewport || !scene.backgroundSize) return;
    // if (!viewport) return;
    if (!backgroundSize) return;
    if (!redrawToolbar) return;

    const v = scene.viewport;
    const bg = scene.backgroundSize;
    // need to ignore rotat`ion
    const zoomedOut = (v.x === bg.x && v.y === bg.y && v.width === bg.width && v.height === bg.height);
    if (zoomedOut !== internalState.zoom) return;
    internalState.zoom = !zoomedOut;
    redrawToolbar();
    sm.transition('wait');
  }, [scene, backgroundSize, internalState, redrawToolbar]);


  useEffect(() => {
    if (!overlayCanvasRef.current) return;
    if (!backgroundSize || !backgroundSize.length) return;
    if (!worker) return;

    setCallback(sm, 'wait', () => {
      sm.resetCoordinates();
      setShowBackgroundMenu(false);
      setShowOpacityMenu(false);
      updateObscure(false);
    });

    setCallback(sm, 'record', () => {
      setShowBackgroundMenu(false)
      setShowOpacityMenu(false);
      updateObscure(true);
      setShowOpacitySlider(false);
    });
    setCallback(sm, 'background_select', () => {
      sm.resetCoordinates();
      updateObscure(false);
      setShowBackgroundMenu(true);
    });
    setCallback(sm, 'background_link', () => {
      setShowBackgroundMenu(false);
    });
    setCallback(sm, 'background_upload', sceneManager);
    setCallback(sm, 'obscure', () => {
      worker.postMessage({cmd: 'obscure'});
      sm.transition('wait');
    });
    setCallback(sm, 'reveal', () => {
      worker.postMessage({cmd: 'reveal'});
      sm.transition('wait');
    });
    setCallback(sm, 'zoomIn', () => {
      if (!worker) return;
      const sel = getRect(sm.x1(), sm.y1(), sm.x2(), sm.y2());
      worker.postMessage({cmd: 'zoom', rect: sel});
    });
    setCallback(sm, 'zoomOut', () => {
      const imgRect = getRect(0, 0, backgroundSize[0], backgroundSize[1]);
      dispatch({type: 'content/zoom', payload: {'backgroundSize': imgRect, 'viewport': imgRect}});  
    });
    setCallback(sm, 'complete', () => {
      // console.log(`${sm.x1()}, ${sm.x2()}, ${sm.y1()}, ${sm.y2()}`)
      // so if we measure the coordinates to be the same OR the end
      // coordinates, x2 or y2, are less than 0 (no end recorded)
      // just transition back to the start
      if ((sm.x1() === sm.x2() && sm.y1() === sm.y2()) || sm.x2() < 0 || sm.y2() < 0) {
        sm.transition('wait');
      }
      worker.postMessage({cmd: 'endrecording'});
    });
    setCallback(sm, 'opacity_select', () => {
      sm.resetCoordinates();
      // setCanObscure(false);
      updateObscure(false);
      setShowOpacityMenu(true);
    });
    setCallback(sm, 'opacity_display', () => {
      setShowOpacityMenu(false);
      setShowOpacitySlider(true);
    });
    setCallback(sm, 'opacity_render', () => {
      setShowOpacityMenu(false);
      setShowOpacitySlider(true);
    });
    setCallback(sm, 'update_display_opacity', (args) => {
      const opacity: string = args[0];
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.style.opacity=opacity;
      }
    });
    setCallback(sm, 'update_render_opacity', (args) => worker.postMessage({cmd: 'opacity', opacity: args[0]}));

    sm.setMoveCallback(selectOverlay);
    // sm.setStartCallback(storeOverlay);
    setCallback(sm, 'push', () => dispatch({type: 'content/push'}));
    setCallback(sm, 'clear', () => {
      worker.postMessage({cmd: 'clear'});
      sm.transition('done');
    });
    setCallback(sm, 'rotate_clock', () => {
      rotateClockwise();
      sm.transition('done');
    })

    overlayCanvasRef.current.addEventListener('mousedown', (evt: MouseEvent) => sm.transition('down', evt));
    overlayCanvasRef.current.addEventListener('mouseup', (evt: MouseEvent) => sm.transition('up', evt));
    overlayCanvasRef.current.addEventListener('mousemove', (evt: MouseEvent) => sm.transition('move', evt));
  }, [backgroundSize, dispatch, overlayCanvasRef, rotateClockwise, sceneManager, selectOverlay, updateObscure, worker]);

  /**
   * This is the main rendering loop. Its a bit odd looking but we're working really hard to avoid repainting
   * when we don't have to. We should only repaint when a scene changes OR an asset version has changed
   */
  useEffect(() => {
    if (!apiUrl || !scene || !contentCanvasRef?.current || !overlayCanvasRef?.current || !fullCanvasRef?.current) return;
    
    // get the detailed or player content 
    const [bRev, bContent] = [scene.detailContentRev || scene.playerContentRev || 0,  scene.detailContent || scene.playerContent];
    const [oRev, oContent] = [scene.overlayContentRev || 0, scene.overlayContent]
    const backgroundCanvas: HTMLCanvasElement = contentCanvasRef.current;
    const overlayCanvas: HTMLCanvasElement = overlayCanvasRef.current;
    const fullCanvas: HTMLCanvasElement = fullCanvasRef.current;

    // update the revisions and trigger rendering if a revision has changed
    let drawBG = bRev > bgRev;
    let drawOV = oRev > ovRev;
    if (drawBG) setBgRev(bRev); // takes effect next render cycle
    if (drawOV) setOvRev(oRev); // takes effect next render cycle
    
    // this is a scene change, so we can safely assume we must redraw everything that is there.
    // Note that earlier logic (bRev>bgRev or oRev > ovRev) might have prevented us from updating
    // the state because a new scene may have lower version
    if (!sceneId || scene._id !== sceneId) {
      setSceneId(scene._id);
      setBgRev(bRev);
      setOvRev(oRev);
      drawBG = true;
      drawOV = scene.overlayContent !== undefined;
    }

    // if we have nothing new to draw then cheese it
    if (!drawBG && !drawOV) return;

    if (drawBG) {
      const ovUrl = drawOV ? `${apiUrl}/${oContent}` : undefined;
      const bgUrl = drawBG ? `${apiUrl}/${bContent}` : undefined;

      const [scrW, scrH] = getWidthAndHeight();

      // hencefourth canvas is transferred -- this doesn't take effect until the next render
      // so the on this pass it is false when passed to setCanvassesTransferred even if set
      setCanvassesTransferred(true);
      // todo remove width
      const wrkr = setupOffscreenCanvas(backgroundCanvas, overlayCanvas, fullCanvas, canvassesTransferred, scrW, scrH, bgUrl, ovUrl);
      setWorker(wrkr);
      wrkr.onmessage = handleWorkerMessage;
    }
  }, [apiUrl, bgRev, canvassesTransferred, contentCanvasRef, fullCanvasRef, handleWorkerMessage, ovRev, overlayCanvasRef, scene, sceneId])

  // make sure we end the push state when we get a successful push time update
  useEffect(() => sm.transition('done'), [pushTime])

  // force render of current state as soon as we have an API to talk to
  // but not before we have loaded the toolbar (otherwise we just get
  // rendered and do it again)
  useEffect(() => {
    // bail if we haven't attempted authorization
    if (auth === undefined) return;
    if (auth === false && noauth === false) return;

    // otherwise wait until we have populated the toolbar before we get our state
    if (!apiUrl || !dispatch || !toolbarPopulated) return;
    dispatch({type: 'content/pull'});
  }, [apiUrl, dispatch, toolbarPopulated, auth, noauth]);

  return (
    <div className={styles.ContentEditor}
      data-testid="ContentEditor"
      onFocus={() =>{
        if (sm.current === 'background_upload') {
          sm.transition('done')
        }
      }}
    >
      {/* TODO make content a DIV, per https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#use_plain_css_for_large_background_images */}
      <canvas className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
      <canvas className={styles.OverlayCanvas} ref={overlayCanvasRef}/>
      <canvas hidden ref={fullCanvasRef}/>
      <input ref={colorInputRef} type='color' defaultValue='#ff0000' onChange={(evt) => setOverlayColour(evt.target.value)} hidden/>
      {showBackgroundMenu && <div className={`${styles.Menu} ${styles.BackgroundMenu}`}>
        <button onClick={() => sm.transition('upload')}>Upload</button>
        <button onClick={() => sm.transition('link')}>Link</button>
      </div>}
      <Menu open={showOpacityMenu} anchorEl={anchorEl}>
        <MenuItem onClick={() => gmSelectOpacityOption('display')}>Display Opacity</MenuItem>
        <MenuItem onClick={() => gmSelectOpacityOption('render')}>Render Opacity</MenuItem>
      </Menu>
      <Popover
        anchorEl={anchorEl}
        open={showOpacitySlider}
        onClose={gmCloseOpacitySlider}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        <Box sx={{width: "10em", mt: "3em", mb: "1em", mx: "2em"}}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            defaultValue={1}
            aria-label="Default"
            valueLabelDisplay="auto"
            onChange={gmSetOpacity}
          />
        </Box>
      </Popover>
    </div>
  );
}

export default ContentEditor;