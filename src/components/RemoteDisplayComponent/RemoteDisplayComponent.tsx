import { useEffect } from 'react';

import styles from './RemoteDisplayComponent.module.css';

interface RemoteDisplayComponentProps {}

const RemoteDisplayComponent = () => {

  useEffect(() => {
    console.log('MICAH LOADED');
    let url = `ws://localhost:3000/`;
    let ws = new WebSocket(url);
      ws.onopen = (event: Event) => {
        console.log(`MICAH got open event ${JSON.stringify(event)}`);
        ws.send('hello');
        return "";
      };
      // ws.onerror = (this: WebSocket, event: Event) => {
      //   console.error(`MICAH this is ${JSON.stringify(this)}`);
      //   console.error(`MICAH got error event ${JSON.stringify(event)}`);
      // };
      ws.onerror = function(ev: Event) {
        console.error(`MICAH got error ${JSON.stringify(ev)}`);
      }

      ws.onmessage = (event) => {
        console.log(`MICAH RECEIVED ${JSON.stringify(event.data)}`);
      }
  });

  return (
    <div className={styles.map}>
      Hey Bud!
    </div>
  );
}

export default RemoteDisplayComponent;
