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

// --- Native Mobile API Integrations ---

// Tactile Vibration/Haptic feedback (Vibrate API)
export const vibrate = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration failed', e);
    }
  }
};

// Keep Screen On (Screen Wake Lock API)
let wakeLock: any = null;

const handleVisibilityChange = async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Screen Wake Lock re-acquired on visibility change');
    } catch (err) {
      console.warn('Wake Lock re-acquire failed:', err);
    }
  }
};

export const requestScreenWakeLock = async () => {
  if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Screen Wake Lock acquired');
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }
};

export const releaseScreenWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Screen Wake Lock released');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    } catch (err) {
      console.warn('Wake Lock release failed:', err);
    }
  }
};

// Native Mobile Sharing Sheet (Web Share API)
export const shareNative = async (title: string, text: string, url: string): Promise<boolean> => {
  if (typeof window !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
};

// --- Premium Audiophile Sound Feedback Utilities ---

// Quick, extremely quiet and premium click/tap sound on interface action
export const playClickSound = () => {
  if (typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime); // High frequency clear click
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime); // Subtle volume
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio click feedback failed', e);
    }
  }
};

// Satisfying upward major scale notes on success, or a low prompt chord on correction
export const playSuccessChime = (success: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (success) {
        // G5 -> C6 ascending bright success notes
        const playNote = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.025, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        playNote(783.99, ctx.currentTime, 0.15); // G5
        playNote(1046.50, ctx.currentTime + 0.08, 0.25); // C6
      } else {
        // Smooth mellow chord
        const playNote = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.03, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        playNote(220.00, ctx.currentTime, 0.25); // A3
        playNote(261.63, ctx.currentTime + 0.04, 0.25); // C4
      }
    } catch (e) {
      console.warn('Audio chime feedback failed', e);
    }
  }
};


// --- Native Push Notifications Helpers ---

const VAPID_PUBLIC_KEY = 'BHk1uroqx4HMHX1c3ldVPuO3AYWBGByuqlYBjWPW2YttFtiurT8cI731ckrp7K_Q491TtgpAkZL7ioLvVKtmtJo';

// Helper to convert base64 VAPID key to Uint8Array required by push manager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Request permission and subscribe browser/mobile to push notifications
export const subscribeUserToPush = async (userId: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this environment.');
    return false;
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was denied by the user.');
      return false;
    }

    // 2. Retrieve active registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Successfully subscribed user inside browser:', subscription);

    // 4. Save to our backend server
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server subscription sync failed: ${errText}`);
    }

    return true;
  } catch (err) {
    console.error('Error subscribing to web push:', err);
    return false;
  }
};

// Check if notification permission is already granted
export const checkPushPermission = (): 'granted' | 'denied' | 'default' => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
};


