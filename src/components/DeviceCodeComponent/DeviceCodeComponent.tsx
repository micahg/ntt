import { useEffect } from 'react';
import styles from './DeviceCodeComponent.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';

interface DeviceCodeComponentProps {}

const DeviceCodeComponent = (props: DeviceCodeComponentProps) => {

  const dispatch = useDispatch();

  const deviceCode = useSelector((state: AppReducerState) => state.environment.deviceCode);
  
  useEffect(() => {
    dispatch({type: 'environment/devicecode'})
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.DeviceCodeComponent} data-testid="DeviceCodeComponent">
      Visit <b>{deviceCode ? deviceCode.verification_uri : "Fetching..."}</b>
      <br/>
      and
      <br/>
      Enter Code <b>{deviceCode  ? deviceCode.user_code : "Fetching..."}</b>
    </div>
  );
};

export default DeviceCodeComponent;
