/**
 * Safely writes a key-value pair to localStorage.
 * Catches QuotaExceededError or security exceptions gracefully so the app does not crash.
 */
export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[LocalStorage] Failed to set "${key}" due to storage limit or restriction:`, e);
  }
}
