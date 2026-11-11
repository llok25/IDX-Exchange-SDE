import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ListingsPage from './components/ListingsPage.jsx';
import PropertyDetailPage from './components/PropertyDetailPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="*" element={<ListingsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
