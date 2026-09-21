import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SeriesDetailScreen } from './src/features/series/SeriesDetailScreen';

// We have to mock useNetworkStore and API
import { useNetworkStore } from './src/store/network';
import { ApiClient } from './src/api/client';
import { SeriesDAO } from './src/db/dao';

// Need to avoid real SQLite / Zustand issues by mocking
jest = require('jest-mock');
jest.mock('./src/store/network', () => ({
  useNetworkStore: () => ({ isOnline: true })
}));

const App = () => (
  <MemoryRouter initialEntries={['/series/ill-eat-your-mom-first']}>
    <Routes>
      <Route path="/series/:slug" element={<SeriesDetailScreen />} />
    </Routes>
  </MemoryRouter>
);

try {
  console.log("Rendering SeriesDetailScreen...");
  const html = renderToString(<App />);
  console.log("SeriesDetailScreen rendered! Length:", html.length);
} catch(e) {
  console.error("Crash during SeriesDetailScreen:", e);
}
