import './pwa.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';

// Global LocalStorage QuotaExceededError Protection & Cache Eviction
try {
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
    } catch (e) {
      const errName = e instanceof Error ? e.name : '';
      const errCode = (e as any)?.code;
      const isQuotaError = 
        errName === 'QuotaExceededError' || 
        errName === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        errCode === 22;

      if (isQuotaError) {
        console.warn(`[LocalStorage] Quota exceeded while writing key "${key}". Evicting firestore cache...`);
        try {
          // Clear all keys starting with 'fs_cache_'
          Object.keys(localStorage)
            .filter(k => k.startsWith('fs_cache_'))
            .forEach(k => localStorage.removeItem(k));
          
          // Retry the original write once
          originalSetItem.call(this, key, value);
          console.log(`[LocalStorage] Successfully wrote "${key}" after cache eviction.`);
        } catch (retryError) {
          console.error("[LocalStorage] Storage still full after cache eviction:", retryError);
        }
      } else {
        console.warn(`[LocalStorage] Failed to write key "${key}":`, e);
      }
    }
  };
} catch (err) {
  console.warn("Unable to patch Storage.prototype.setItem:", err);
}




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary language="en">
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
);
