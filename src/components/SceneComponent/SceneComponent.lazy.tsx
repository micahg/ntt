import React, { lazy, Suspense } from 'react';

const LazySceneComponent = lazy(() => import('./SceneComponent'));

const SceneComponent = (props: JSX.IntrinsicAttributes & { children?: React.ReactNode; }) => (
  <Suspense fallback={null}>
    <LazySceneComponent {...props} />
  </Suspense>
);

export default SceneComponent;
