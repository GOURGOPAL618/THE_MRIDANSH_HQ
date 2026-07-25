/**
 * Local Storage Helpers
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
  }
}

/**
 * Cookie Helpers
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameLenPlus = name.length + 1;
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter((cookie) => cookie.substring(0, nameLenPlus) === `${name}=`)
      .map((cookie) => decodeURIComponent(cookie.substring(nameLenPlus)))[0] || null
  );
}

export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax; Secure`;
}

export function deleteCookie(name: string): void {
  setCookie(name, "", -1);
}
