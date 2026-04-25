import { registerSW } from 'virtual:pwa-register';

let deferredPrompt: any = null;

// Register service worker updates and reload automatically when a new version is ready.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const key = 'usc-sw-auto-reloaded';
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    updateSW(true);
  },
  onRegisteredSW() {
    sessionStorage.removeItem('usc-sw-auto-reloaded');
  },
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
});

window.addEventListener('appinstalled', () => {
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
});

export const getDeferredPrompt = () => deferredPrompt;

export const clearDeferredPrompt = () => {
  deferredPrompt = null;
};
