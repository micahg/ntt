import { createRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IMG_URI, loadImage, obscureOverlay, renderImage, setupOverlayCanvas, selectOverlay, storeOverlay, clearOverlaySelection} from '../../utils/drawing';
import { MouseStateMachine } from '../../utils/mousestatemachine';
import { setCallback } from '../../utils/statemachine';
import styles from './ContentEditor.module.css';

const sm = new MouseStateMachine();

interface ContentEditorProps {}

const ContentEditor = () => {
  const dispatch = useDispatch();
  const contentCanvasRef = createRef<HTMLCanvasElement>();
  const overlayCanvasRef = createRef<HTMLCanvasElement>();
  
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [canObscure, setCanObscure] = useState<boolean>(false);

  const getContent = () => {
    const cnvs = contentCanvasRef.current;
    if (!cnvs) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get content canvas ref`);
      return;
    }

    const ctx = cnvs.getContext('2d', { alpha: false });
    if (!ctx) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get content canvas context`);
      return;
    }
    return [cnvs, ctx];
  }

  const getOverlay = () => {
    const overlayCnvs = overlayCanvasRef.current;
    if (!overlayCnvs) {
      // TODO SIGNAL ERROR
      console.error(`Unable to get overlay canvas ref`)
      return;
    }
    const overlayCtx = overlayCnvs.getContext('2d', {alpha: true})
    if (!overlayCtx) {
      // TODO SIGNAL ERROR
      console.error('Unable to get overlay canvas context')
      return;
    }
    return [overlayCnvs, overlayCtx];
  }

  const obscure = (x1: number, y1: number, x2: number, y2: number) => {
    let overlay = getOverlay();
    if (!overlay) return;

    obscureOverlay.bind(overlay[1] as CanvasRenderingContext2D)(x1, y1, x2, y2);
    overlayCanvasRef.current?.toBlob((blob: Blob | null) => {
      if (!blob) {
        // TODO SIGNAL ERROR
        return;
      }
      dispatch({type: 'content/overlay', payload: blob})
    }, 'image/png', 1);
  }

  useEffect(() => {
    const content = getContent();
    const overlay = getOverlay();
    if (!content || !overlay) return;
    const contentCnvs = content[0] as HTMLCanvasElement;
    const overlayCnvs = overlay[0] as HTMLCanvasElement;
    const contentCtx = content[1] as CanvasRenderingContext2D;
    const overlayCtx = overlay[1] as CanvasRenderingContext2D;

    setCallback(sm, 'wait', sm.resetCoordinates);
    setCallback(sm, 'record', () => {
      setShowMenu(false)
      setCanObscure(true);
    });
    setCallback(sm, 'background_select', () => {
      clearOverlaySelection.bind(overlayCtx)();
      sm.resetCoordinates();
      setCanObscure(false);
      setShowMenu(true);
    });
    setCallback(sm, 'obscure', () => {
      obscure(sm.x1(), sm.y1(), sm.x2(), sm.y2());
      sm.transition('wait');
    })
    sm.setMoveCallback(selectOverlay.bind(overlayCtx));
    sm.setStartCallback(storeOverlay.bind(overlayCtx));

    loadImage(IMG_URI)
      .then(img =>renderImage(img, contentCnvs, contentCtx))
      .then(() => setupOverlayCanvas(contentCnvs, overlayCnvs, overlayCtx))
      .then(() => {
        overlayCnvs.addEventListener('mousedown', (evt: MouseEvent) => sm.transition('down', evt));
        overlayCnvs.addEventListener('mouseup', (evt: MouseEvent) => sm.transition('up', evt));
        overlayCnvs.addEventListener('mousemove', (evt: MouseEvent) => sm.transition('move', evt));
      }).catch(err => {
        // TODO SIGNAL ERROR
        console.log(`Unable to load image: ${JSON.stringify(err)}`);
      });
  });

  return (
    <div className={styles.ContentEditor} data-testid="ContentEditor">
      <div className={styles.ContentContainer} data-testid="RemoteDisplayComponent">
        <canvas className={styles.ContentCanvas} ref={contentCanvasRef}>Sorry, your browser does not support canvas.</canvas>
        <canvas className={styles.OverlayCanvas} ref={overlayCanvasRef}/>
      </div>
      {showMenu && <div className={styles.BackgroundMenu}>
        <a href='#'>Upload</a>
        <a href='#'>Link</a>
      </div>}
      <div className={styles.ControlsContainer}>
        <input disabled={true}></input>
        <button onClick={() => sm.transition('background')}>Background</button>
        <button>Pan and Zoom</button>
        <button disabled={!canObscure} onClick={() => {
          sm.transition('obscure')
        }}>Obscure</button>
      </div>
    </div>
  );
}

export default ContentEditor;
