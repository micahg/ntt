import React, { RefObject, createRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';
import { loadImage, obscureOverlay,
         selectOverlay, storeOverlay, revealOverlay,
         getRect, clearOverlay, setOverlayOpacity,
         setOverlayColour, 
         renderImageInContainer,
         setOverlayAsBaseData,
         setupOffscreenCanvas,
         selectOverlayEnd,
         clearSelection,
         loadOverlay} from '../../utils/drawing';
import { rotateRect, scaleSelection } from '../../utils/geometry';
import { MouseStateMachine } from '../../utils/mousestatemachine';
import { setCallback } from '../../utils/statemachine';
import styles from './ContentEditor.module.css';
import { Opacity, ZoomIn, ZoomOut, LayersClear, Sync, Map, Palette, VisibilityOff, Visibility } from '@mui/icons-material';
import { GameMasterAction } from '../GameMasterActionComponent/GameMasterActionComponent';
import { Box, Menu, MenuItem, Popover, Slider } from '@mui/material';

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
}

const ContentEditor = ({populateToolbar, redrawToolbar, manageScene}: ContentEditorProps) => {
  const dispatch = useDispatch();
  const contentCanvasRef = createRef<HTMLCanvasElement>();
  const overlayCanvasRef = createRef<HTMLCanvasElement>();
  const fullCanvasRef = createRef<HTMLCanvasElement>();
  const colorInputRef = createRef<HTMLInputElement>();
  
  const [internalState, ] = useState<InternalState>({zoom: false, obscure: false, color: createRef()});
  const [contentCtx, setContentCtx] = useState<CanvasRenderingContext2D|null>(null);
  // const [overlayCtx, setOverlayCtx] = useState<CanvasRenderingContext2D|null>(null);
  // const [overlayCtx, setOverlayCtx] = useState<ImageBitmapRenderingContext|null>(null);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState<boolean>(false);
  const [showOpacityMenu, setShowOpacityMenu] = useState<boolean>(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState<boolean>(false);
  const [backgroundSize, setBackgroundSize] = useState<number[]|null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bgRev, setBgRev] = useState<number>(0);
  const [ovRev, setOvRev] = useState<number>(0);
  const [sceneId, setSceneId] = useState<string>(); // used to track flipping between scenes

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

  const updateOverlay = () => {
    fullCanvasRef.current?.toBlob((blob: Blob | null) => {
      if (!blob) {
        // TODO SIGNAL ERROR
        return;
      }
      dispatch({type: 'content/overlay', payload: blob})
      setOvRev(ovRev + 1);
    }, 'image/png', 1);
  }

  const updateObscure = (value: boolean) => {
    if (internalState.obscure !== value && redrawToolbar) {
      internalState.obscure = value;
      redrawToolbar();
    }
  }
  // const obscure = (x1: number, y1: number, x2: number, y2: number) => {
  //   // if (!overlayCtx) return;
  //   // obscureOverlay.bind(overlayCtx)(x1, y1, x2, y2);
  //   obscureOverlay();
  //   // updateOverlay();
  // }

  const sceneManager = () => {if (manageScene) manageScene(); }

  const zoomIn = (canvas: HTMLCanvasElement, bgSize: number[],
                  x1: number, y1: number, x2: number, y2: number) => {
    let sel = getRect(x1, y1, x2, y2);
    // the viewport (vp) in this case is not relative to the background image
    // size, but the size of the canvas upon which it is painted
    let vp = getRect(0,0, canvas.width, canvas.height);
    const [w, h] = bgSize;

    // rotate the selection
    // TODO this doesn't need rotation in portrait
    if (w < h) {
      sel = rotateRect(-90, sel, vp.width, vp.height);
      vp = getRect(0,0, canvas.height, canvas.width);
    }
    const selection = scaleSelection(sel, vp, w, h);
    dispatch({type: 'content/zoom', payload: {'viewport': selection}});
    clearSelection();
    sm.transition('wait');
  }

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
      { icon: Opacity,       tooltip: "Opacity",                   hidden: () => false,               disabled: () => internalState.obscure,  callback: (evt) => gmSelectOpacityMenu(evt)}
    ];
    populateToolbar(actions);
    setToolbarPopulated(true);
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  // if we don't have a canvas OR have already set context, then bail
  useEffect(() => {
    if (!contentCanvasRef.current || contentCtx != null) return;
    setContentCtx(contentCanvasRef.current.getContext('2d', { alpha: false }));
  }, [contentCanvasRef, contentCtx]);

  // useEffect(() => {
  //   if (!overlayCanvasRef.current || overlayCtx != null) return;
  //   setOverlayCtx(overlayCanvasRef.current.getContext('2d', { alpha: true }));
  // }, [overlayCanvasRef, overlayCtx]);

  useEffect(() => {
    if (!scene || !scene.viewport) return;
    // if (!viewport) return;
    if (!backgroundSize) return;
    if (!redrawToolbar) return;
    const v = scene.viewport;
    const [w, h] = backgroundSize;
    const zoomedOut: boolean = (v.x === 0 && v.y === 0 && w === v.width && h === v.height);
    // if zoomed out and in then state changed.... think about it man...
    // if (zoomedOut !== zoomedIn) return;
    // setZoomedIn(!zoomedOut);
    if (zoomedOut !== internalState.zoom) return;
    internalState.zoom = !zoomedOut;
    redrawToolbar();

    sm.transition('wait');
  }, [scene, backgroundSize, internalState, redrawToolbar]);


  useEffect(() => {
    if (!overlayCanvasRef.current) return;
    if (!backgroundSize || !backgroundSize.length) return;
    const overlayCanvas = overlayCanvasRef.current;

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
      obscureOverlay();
      sm.transition('wait');
    });
    setCallback(sm, 'reveal', () => {
      revealOverlay();
      sm.transition('wait');
    });
    setCallback(sm, 'zoomIn', () => {
      zoomIn(overlayCanvas, backgroundSize, sm.x1(), sm.y1(), sm.x2(), sm.y2())
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
      selectOverlayEnd();
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
    setCallback(sm, 'update_render_opacity', (args) => setOverlayOpacity(args[0]));

    sm.setMoveCallback(selectOverlay);
    sm.setStartCallback(storeOverlay);
    setCallback(sm, 'push', () => {
      // TODO these two lines update overlay AND state asynchronously
      // I'm worried that on slow clients the state may update before the image
      // and we'll get an old image. Might want to sync these... include the 
      // overlay image as payload for content/push and if its there in the
      // middleware send it first? IF YOU DO FIX THIS find all the instances
      // of updateOverlay because there is more than this one
      updateOverlay();
      dispatch({type: 'content/push'})
    });
    setCallback(sm, 'clear', () => {
      clearOverlay();
      sm.transition('done');
    });

    overlayCanvasRef.current.addEventListener('mousedown', (evt: MouseEvent) => sm.transition('down', evt));
    overlayCanvasRef.current.addEventListener('mouseup', (evt: MouseEvent) => sm.transition('up', evt));
    overlayCanvasRef.current.addEventListener('mousemove', (evt: MouseEvent) => sm.transition('move', evt));
  }, [backgroundSize, dispatch, overlayCanvasRef, sceneManager, updateObscure, updateOverlay, zoomIn]);

  /**
   * Handle scene changes to ensure future renders
   */
  useEffect(() => {
    if (!scene) return;
    if (sceneId !== scene._id) {
      // these setters will trigger a rerender so after setting up the state properly
      // and we'll do real work on the next render
      setSceneId(scene._id);
      setBgRev(0);
      setOvRev(0);
      return;
    }
  }, [scene, sceneId])

  /**
   * Little context here... this component wont render the background directly!
   * It will send to the server and wait for the result to update it.  So, we
   * dont actually need the apiUrl but whatever, it just ensures we're in a good
   * state.
   * 
   * There is a bit of a situation here though because we might also get the overlay
   * before we get the background and we can't really sequence these events.
   */
  useEffect(() => {
    /**
     * THIS CAN BE BETTER
     * 
     * I THINK ITS FIXED BY NOT CALLING setSceneId, setBgRev, SetOvRev from within
     * this callback
     * 
     * if you put a breakpoint inside the `if (bg) {` block down below, we hit
     * that breakpoint twice on a scene flip... something is triggering a needless
     * rerender
     */
    if (!apiUrl || !scene || !sceneId || !scene.playerContent || !contentCtx || !overlayCanvasRef || !fullCanvasRef) return;
    const overlayCanvas: HTMLCanvasElement | null = overlayCanvasRef.current;
    const fullCanvas: HTMLCanvasElement | null = fullCanvasRef.current;
    if (!overlayCanvas) return;
    if (!fullCanvas) return;

    // if the scene has changed, reset our revisions so we properly redraw any updated assets
    // also because the setter from useState (setBgRev/setOvRev) don't take effect until next
    // render we need localized up-to-date values to avoid needless rerendering.
    // SOMETHING IS OFF about that comment above... logically the scene id should also stay
    // changed until the next render
    const curBgRev = (sceneId !== scene._id) ? 0 : bgRev;
    const curOvRev = (sceneId !== scene._id) ? 0 : ovRev;

    const [rev, content] = scene.detailContentRev ? [scene.detailContentRev, scene.detailContent] : [scene.playerContentRev, scene.playerContent];
    const ovUrl = (scene.overlayContentRev && scene.overlayContentRev > curOvRev) ? `${apiUrl}/${scene.overlayContent}` : undefined;
    const bgPromise = (rev && rev > curBgRev) ? loadImage(`${apiUrl}/${content}`) : Promise.resolve(null);
    bgPromise.then(bg => {
        if (bg) {
          if (rev) setBgRev(rev);
          setBackgroundSize([bg.width, bg.height]);
          // if the scene hasn't set a viewport, default to entire background
          if (!scene.viewport) {
            const imgRect = getRect(0, 0, bg.width, bg.height);
            dispatch({type: 'content/zoom', payload: {'backgroundSize': imgRect, 'viewport': imgRect}});
          }
          renderImageInContainer(bg, contentCtx, true)
          setupOffscreenCanvas(overlayCanvas, fullCanvas, contentCtx.canvas.width,
                               contentCtx.canvas.height, bg.width, bg.height);
        }
        if (ovUrl) {
          if (scene.overlayContentRev) setOvRev(scene.overlayContentRev);
          loadOverlay(ovUrl);
        }
      });
  }, [apiUrl, scene, sceneId, contentCtx, dispatch, ovRev, bgRev, overlayCanvasRef, fullCanvasRef])

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
      <input ref={colorInputRef} type='color' defaultValue='#ff0000' onChange={(evt) => setOverlayColour(evt.target.value)}/>
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
