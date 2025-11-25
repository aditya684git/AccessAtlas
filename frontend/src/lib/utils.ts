import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check whether localStorage is available and usable.
export function isLocalStorageAvailable(): boolean {
  const testKey = '__localstorage_test__';
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
