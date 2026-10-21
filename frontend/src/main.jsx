import React from 'react';
import { createRoot } from 'react-dom/client';
import ListingsPage from './components/ListingsPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ListingsPage />
  </React.StrictMode>,
);
