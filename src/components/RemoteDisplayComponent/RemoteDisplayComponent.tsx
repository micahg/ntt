import { createRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';
import { loadImage, renderImage } from '../../utils/drawing';
import { Rect, calculateBounds, fillToAspect, rotate } from '../../utils/geometry';

import styles from './RemoteDisplayComponent.module.css';

const RemoteDisplayComponent = () => {
  const contentCanvasRef = createRef<HTMLCanvasElement>();
  const overlayCanvasRef = createRef<HTMLCanvasElement>();
  const apiUrl: string | undefined = useSelector((state: AppReducerState) => state.environment.api);
  const [contentCtx, setContentCtx] = useState<CanvasRenderingContext2D|null>(null);
  const [overlayCtx, setOverlayCtx] = useState<CanvasRenderingContext2D|null>(null);

  useEffect(() => {
    if (!contentCanvasRef.current || contentCtx != null) return;
    setContentCtx(contentCanvasRef.current.getContext('2d', { alpha: false }));
  }, [contentCanvasRef, contentCtx]);

  useEffect(() => {
    if (!overlayCanvasRef.current || overlayCtx != null) return;
    setOverlayCtx(overlayCanvasRef.current.getContext('2d', { alpha: true }));
  }, [overlayCanvasRef, overlayCtx]);

  useEffect(() => {
    if (!overlayCtx) return;
    if (!contentCtx) return;

    // TODO FIX THIS FIRST YIKES
    let url = `ws://localhost:3000/`;
    let ws = new WebSocket(url);
    ws.onopen = (event: Event) => {
      console.log(`Got open event ${JSON.stringify(event)}`);
    };

    ws.onerror = function(ev: Event) {
      console.error(`MICAH got error ${JSON.stringify(ev)}`);
    }

    ws.onmessage = (event) => {
      let data = event.data;
      let js = null;
      try {
        js = JSON.parse(data);
      } catch(e) {
        console.error(`Unable to parse WS message: ${JSON.stringify(data)}`);
        return;
      }

      // ignore null state -- happens when server has no useful state loaded yet
      if (js.state === null) return;

      // if we don't have an API URL we'll never get WS messages... seems impossible
      if (apiUrl === null) {
        console.error('THE IMPOSSIBLE HAS HAPPENED -- WS MESSAGE WITH NO API SERVER WHAT');
        return;
      }

      if (!js.state.viewport) {
        console.error('Unable to render without viewport');
        return;
      }
      let viewport: Rect = js.state.viewport;

      let ts: number = new Date().getTime();
      let overlayUri: string | null = null;
      if ('overlay' in js.state && js.state.overlay) {
        overlayUri = `${apiUrl}/${js.state.overlay}?${ts}`;
      }

      let backgroundUri: string | null = null;
      if ('background' in js.state && js.state.background) {
        backgroundUri = `${apiUrl}/${js.state.background}?${ts}`;
      }

      if (!backgroundUri) {
        console.error(`Unable to determine background URL`);
        return;
      }

      /**
       * I hate this so much... if someone every does contribute to this
       * project and your js game is better than mine, see if you can make this
       * less isane. The point is to calculate the expanded the selection to
       * fill the screen (based on the aspect ratio of the map) then draw the
       * overlay, then the background. If there is no overlay then just draw
       * background with expanded selection if there is one.
       */
      loadImage(backgroundUri).then(bgImg => {
        let bgVP = fillToAspect(viewport, bgImg.width, bgImg.height);
        if (overlayUri) {
          loadImage(overlayUri).then(ovrImg => {
            /* REALLY IMPORTANT - base overlay on the BG Viewport as it can shift the
             * image. If the zoomed selection is so small that we render negative space
             * (eg beyond the bordres) the viewport shifts to render from the border */
            
            // start assuming no rotation (the easy case)

            // TODO detect portrait - ALL OF THIS CODE assumes editor/overlay are landsacpe
            let rot: boolean = bgVP.width < bgVP.height;
            if (bgVP.width < bgVP.height) {
              let [x1, y1] = rotate(90, bgVP.x, bgVP.y, bgImg.width,
                                    bgImg.height);
              let [x2, y2] = rotate(90, bgVP.x + bgVP.width, bgVP.y + bgVP.height,
                                    bgImg.width, bgImg.height);
              [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
              [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
              let w = x2 - x1;
              let h = y2 - y1;
              let scale = ovrImg.width/bgImg.height;
              x1 *= scale;
              y1 *= scale;
              w *= scale;
              h *= scale;
              let olVP = {x: x1, y: y1, width: w, height: h}

              renderImage(ovrImg, overlayCtx, true, false, olVP)
                .then(() => renderImage(bgImg, contentCtx, true, false, bgVP))
                .catch(err => console.error(`Error rendering background or overlay image: ${JSON.stringify(err)}`));

              console.log('hi');
            } else {

              let scale = (rot ? bgImg.height : bgImg.width)/ovrImg.width;
  
  
              // TODO detect portrait - assumes overlay always wide
              let width = bgImg.width < bgImg.height ? viewport.height : viewport.width;
              let height = bgImg.width < bgImg.height ? viewport.width : viewport.height;
              let olVP = {x: viewport.x/scale, y: viewport.y/scale, width: width/scale, height: height/scale};
              olVP = fillToAspect(olVP, ovrImg.width, ovrImg.height);
              renderImage(ovrImg, overlayCtx, true, false, olVP)
                .then(() => renderImage(bgImg, contentCtx, true, false, bgVP))
                .catch(err => console.error(`Error rendering background or overlay image: ${JSON.stringify(err)}`));
            }
          }).catch(err => console.error(`Error loading overlay iamge ${overlayUri}: ${JSON.stringify(err)}`));
        } else {
          renderImage(bgImg, contentCtx, true, false, bgVP)
            .catch(err => console.error(`Error rendering background imager: ${JSON.stringify(err)}`));
        }
      }).catch(err => console.error(`Error loading background image: ${JSON.stringify(err)}`))
    }
  }, [apiUrl, contentCtx, overlayCtx]);

  return (
    <div className={styles.map}>
      <canvas className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
      <canvas className={styles.OverlayCanvas} ref={overlayCanvasRef}/>
    </div>
  );
}

export default RemoteDisplayComponent;
