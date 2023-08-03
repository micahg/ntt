import { Box } from '@mui/material';
import React, { lazy, Suspense } from 'react';

const LazyContentEditor = lazy(() => import('./ContentEditor'));

/*
const SearchResultsList = (props: JSX.IntrinsicAttributes & { value?: string; onSelected: (student: Student) => void; children?: React.ReactNode; }) => (
  <Suspense fallback={null}>
    <LazySearchResultsList {...props} />
  </Suspense>
);*/
const ContentEditor = (props: JSX.IntrinsicAttributes & { actionGenerator: (element: React.ReactElement) => void; children?: React.ReactNode; }) => (
  <Suspense fallback={null}>
    <LazyContentEditor {...props} />
  </Suspense>
);

export default ContentEditor;
