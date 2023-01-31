import React, { FC } from 'react';
import styles from './ContentEditor.module.css';

interface ContentEditorProps {}

const ContentEditor: FC<ContentEditorProps> = () => (
  <div className={styles.ContentEditor} data-testid="ContentEditor">
    ContentEditor Component
  </div>
);

export default ContentEditor;
