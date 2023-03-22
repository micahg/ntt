import { createRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';
import { loadImage, renderImage } from '../../utils/drawing';

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
      console.log(`MICAH got open event ${JSON.stringify(event)}`);
      ws.send('hello');
      return "";
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

      let ts: number = new Date().getTime();
      if ('overlay' in js.state && js.state.overlay) {
        let asset: string = js.state.overlay;
        loadImage(`${apiUrl}/${asset}?${ts}`).then((img: HTMLImageElement) => {
          renderImage(img, overlayCtx, true);
        }).catch(err => {
          console.error(err);
        });
      }

      if ('background' in js.state && js.state.background) {
        let asset: string = js.state.background;
        loadImage(`${apiUrl}/${asset}?${ts}`).then((img: HTMLImageElement) => {
          renderImage(img, contentCtx, true);
        }).catch(err => {
          console.error(err);
        });
      }

      if ('viewport' in js.state && js.state.viewport) {

      }
    }
  }, [contentCtx, overlayCtx]);

  return (
    <div className={styles.map}>
      <canvas className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
      <canvas className={styles.OverlayCanvas} ref={overlayCanvasRef}/>
    </div>
  );
}

export default RemoteDisplayComponent;
