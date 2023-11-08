// import styles from './SceneComponent.module.css';
import { Box, Button, TextField, Tooltip } from '@mui/material';
import { createRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NewSceneBundle } from '../../middleware/ContentMiddleware';
import { Scene } from '../../reducers/ContentReducer';
import { AppReducerState } from '../../reducers/AppReducer';

const NAME_REGEX = /^[\w\s]{1,64}$/;

interface SceneComponentProps {
  scene?: Scene, // scene to manage should be undefined for new
  editScene?: () => void, // callback to trigger content editor
}

// TODO use destructuring
const SceneComponent = ({scene, editScene}: SceneComponentProps) => {
  const dispatch = useDispatch();
  
  const [player, setPlayer] = useState<File|undefined>();
  const [detail, setDetail] = useState<File|undefined>();
  const [playerUpdated, setPlayerUpdated] = useState<boolean>(false);
  const [detailUpdated, setDetailUpdated] = useState<boolean>(false);
  const [resolutionMismatch, setResolutionMismatch] = useState<boolean>(false)
  const [name, setName] = useState<string>();
  const [creating, setCreating] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>();
  const playerImageRef = createRef<HTMLImageElement>();
  const detailImageRef = createRef<HTMLImageElement>();
  const apiUrl = useSelector((state: AppReducerState) => state.environment.api);
  const disabledCreate = creating || (!name && !scene) || !!nameError || player === undefined || resolutionMismatch;

  const handleNameChange = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setName(event.target.value);
    const match = NAME_REGEX.test(event.target.value);
    if (event.target.value && match && nameError) {
      setNameError(undefined);
    } else if (!match && !nameError) {
      setNameError('Invalid scene name');
    }
  }

  const selectFile = (layer:string) => {
    const input = document.createElement('input');
    input.type='file';
    input.multiple = false;
    input.onchange = () => {
      if (!input.files) return;
      if (layer === 'detail') {
        // TODO compare against other resolution
        setDetail(input.files[0]);
        setDetailUpdated(true);
        if (detailImageRef.current) detailImageRef.current.src = URL.createObjectURL(input.files[0]);
      }
      else if (layer === 'player') {
        // TODO comapre against other resolution
        setPlayer(input.files[0]);
        setPlayerUpdated(true);
        if (playerImageRef.current) playerImageRef.current.src = URL.createObjectURL(input.files[0]);
      }
      else console.error('Invalid layer');
    }
    input.click();
  }

  const updateScene = () => {
    setCreating(true);
    if (scene) {
      // TODO clear overlay
      if (player && playerUpdated) dispatch({type: 'content/player', payload: player})
      if (detail && detailUpdated) dispatch({type: 'content/detail', payload: detail})
      if (editScene) editScene();
      return;
    }
    if (!name) return; // TODO ERROR
    if (!player) return; // TODO ERROR
    const data: NewSceneBundle = { description: name, player: player, detail: detail};
    dispatch({type: 'content/createscene', payload: data});
  }

  const imageLoaded = () => {
    if (playerImageRef.current && detailImageRef.current) {
      if (playerImageRef.current.naturalWidth !== detailImageRef.current.naturalWidth ||
          playerImageRef.current.naturalHeight !== detailImageRef.current.naturalHeight) {
          setResolutionMismatch(true);
      } else setResolutionMismatch(false);
    }
  }

  useEffect(() => {
    if (scene?.detailContent && detailImageRef?.current)
      detailImageRef.current.src = `${apiUrl}/${scene.detailContent}`;

    if (scene?.playerContent && playerImageRef?.current)
      playerImageRef.current.src = `${apiUrl}/${scene.playerContent}`;
  }, [apiUrl, scene, playerImageRef, detailImageRef]);

  return (
    <Box sx={{
      height: '100%',
      width: '100%',
      gap: '1em',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TextField
        disabled={!!scene}
        id="standard-basic"
        label="Scene Name"
        variant="standard"
        defaultValue={scene?.description}
        helperText={nameError}
        error={!!nameError}
        onChange={event => handleNameChange(event)}
      >
      </TextField>
      <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1em'}}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: 4,
          borderRadius: 2,
          padding: 1,
          minHeight: '25vh',
          width: '25vw'}}
        >
          <Box component="img" ref={playerImageRef} sx={{width: '100%'}} onLoad={() => imageLoaded()}/>
        </Box>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: 4,
          borderRadius: 2,
          padding: 1,
          minHeight: '25vh',
          width: '25vw'}}
        >
          <Box component="img" ref={detailImageRef} sx={{width: '100%'}} onLoad={() => imageLoaded()}/>
        </Box>
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1em'}}>
        <Tooltip title="The background players see">
          <span>
            <Button
              variant="outlined"
              onClick={() => selectFile('player')}
            >
              Player Background
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="A background only you, the use, sees (should be the same size as the table background)">
          <span>
            <Button
              variant="outlined"
              onClick={() => selectFile('detail')}
            >
              Detailed Background
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1em'}}>
        <Tooltip title="Create the scene">
          <span>
            <Button variant="contained" disabled={disabledCreate} onClick={() => updateScene()}>Create</Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SceneComponent;
