import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppReducerState } from '../../reducers/AppReducer';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';

interface DeviceCodeComponentProps {}

const DeviceCodeComponent = (props: DeviceCodeComponentProps) => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const deviceCode = useSelector((state: AppReducerState) => state.environment.deviceCode);
  const authorized = useSelector((state: AppReducerState) => state.environment.auth);
  // note, the next two can be dubious -- deviceCode is called twice in strict mode, which means the overall
  // object changes -- we rely on the fact that the polling/expiration values dont change.
  const deviceCodeInterval = useSelector((state: AppReducerState) => state.environment.deviceCode?.interval);
  const deviceCodeExpiry = useSelector((state: AppReducerState) => state.environment.deviceCode?.expires_in);

  const [expired, setExpired] = useState<boolean>(false);

  
  useEffect(() => {
    dispatch({type: 'environment/devicecode'});
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Loop around polling for the token (waiting for the device code to be entered)
   */
  useEffect(() => {
    if (!deviceCodeInterval || !deviceCodeExpiry) return;

    // periodically trigger polling for the auth
    const intervalId: NodeJS.Timer = setInterval(() => dispatch({type: 'environment/devicecodepoll'}), 1000 * deviceCodeInterval);

    // eventually give up on polling
    const timeoutId: NodeJS.Timer = setTimeout(() => {
      setExpired(true);
      clearInterval(intervalId);
    }, 1000 * deviceCodeExpiry);

    // cancel timers when we're destroyed
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    }
  }, [deviceCodeInterval, deviceCodeExpiry, dispatch]);

  /**
   * Once we're authorized head on back
   */
  useEffect(() => {
    if (!authorized) return;
    navigate('/display');
  }, [navigate, authorized])

  return (
    <Box sx={{padding: '1em', width: '100%', maxWidth: 500}}>
      <Typography variant="h4" gutterBottom>Network Table Top</Typography>
      <Paper sx={{padding: '1em', margin: '1em 0'}} elevation={6}>

        <Typography variant="h5" gutterBottom>Authentication Required</Typography>
        <br/>
        {expired && <Box>
          <Typography variant="h6">The request has timed out.<br/>Please refresh and try again.</Typography>
          <br/><br/>
        </Box>}
        {!expired && <Typography variant="body1">
          Please visit {deviceCode ?
            <a target='_blank' rel='noreferrer' href={deviceCode.verification_uri_complete}>{deviceCode.verification_uri}</a>
            :
            <b>Fetching...</b>}
          <br/><br/>
          Enter Code <b>{deviceCode  ? deviceCode.user_code : "Fetching..."}</b>
        </Typography>
        }
      </Paper>
    </Box>
  );
};

export default DeviceCodeComponent;
