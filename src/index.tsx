import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App/App';
import reportWebVitals from './reportWebVitals';
import { configureStore } from '@reduxjs/toolkit';
import { AppReducer } from './reducers/AppReducer';
import { EnvironmentMiddleware } from './middleware/EnvironmentMiddleware';
import { Provider } from 'react-redux';

const store = configureStore({
  reducer: AppReducer,
  middleware: [
    EnvironmentMiddleware,
  ],
});

store.dispatch({type: 'environment/config', payload: undefined});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
