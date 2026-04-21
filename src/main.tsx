import { registerSW } from 'virtual:pwa-register';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FinanceProvider } from './contexts/FinanceContext';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <FinanceProvider>
    <App />
  </FinanceProvider>
);
