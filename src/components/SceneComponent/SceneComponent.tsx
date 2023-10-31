// import styles from './SceneComponent.module.css';
import { Box, Button, TextField, Tooltip } from '@mui/material';
import { createRef, useState } from 'react';
import PhotoIcon from '@mui/icons-material/Photo';

const NAME_REGEX = /^[\w\s]+$/;

interface SceneComponentProps {}

// TODO use destructuring
const SceneComponent = (props: SceneComponentProps) => {

  const [table, setTable] = useState<File|undefined>();
  const [user, setUser] = useState<File|undefined>();
  const [name, setName] = useState<string>();
  const [nameError, setNameError] = useState<string>();
  const tableImageRef = createRef<HTMLImageElement>();
  const userImageRef = createRef<HTMLImageElement>();
  const disabledCreate = !name || !!nameError || table === undefined;

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
      if (layer === 'user') {
        setUser(input.files[0]);
        if (userImageRef.current) userImageRef.current.src = URL.createObjectURL(input.files[0]);
      }
      else if (layer === 'table') {
        setTable(input.files[0]);
        if (tableImageRef.current) tableImageRef.current.src = URL.createObjectURL(input.files[0]);
      }
      else console.error('Invalid layer');
    }
    input.click();
  }

  return (
    <Box sx={{
      height: '100%',
      width: '100%',
      gap: '1em',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TextField
        id="standard-basic"
        label="Scene Name"
        variant="standard"
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
          <Box component="img" ref={tableImageRef} sx={{width: '100%'}}/>
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
          <Box component="img" ref={userImageRef} sx={{width: '100%'}}/>
        </Box>
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1em'}}>
        <Tooltip title="The background players see">
          <span>
            <Button
              variant="outlined"
              onClick={() => selectFile('table')}
            >
              Table Background
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="A background only you, the use, sees (should be the same size as the table background)">
          <span>
            <Button
              variant="outlined"
              onClick={() => selectFile('user')}
            >
              User Background
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1em'}}>
        <Tooltip title="Create the scene">
          <span>
            <Button variant="contained" disabled={disabledCreate}>Create</Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SceneComponent;
