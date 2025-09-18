// Guest user localStorage utilities
// Handles saving and retrieving guest user data for form pre-filling

export interface GuestUserData {
  email: string;
  firstName: string;
  lastName: string;
  lastUsed: string; // timestamp
}

const STORAGE_KEY = 'eme-guest-data';

/**
 * Save guest user data to localStorage
 */
export function saveGuestData(data: Omit<GuestUserData, 'lastUsed'>): void {
  if (typeof window === 'undefined') return; // SSR safety

  try {
    const guestData: GuestUserData = {
      ...data,
      lastUsed: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestData));
  } catch (error) {
    console.error('Failed to save guest data to localStorage:', error);
  }
}

/**
 * Retrieve guest user data from localStorage
 */
export function getGuestData(): GuestUserData | null {
  if (typeof window === 'undefined') return null; // SSR safety

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as GuestUserData;

    // Check if data is older than 30 days
    const lastUsed = new Date(data.lastUsed);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (lastUsed < thirtyDaysAgo) {
      // Data is too old, remove it
      clearGuestData();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to retrieve guest data from localStorage:', error);
    return null;
  }
}

/**
 * Update guest user data in localStorage
 */
export function updateGuestData(updates: Partial<Omit<GuestUserData, 'lastUsed'>>): void {
  const existing = getGuestData();
  if (!existing) {
    console.warn('No existing guest data to update');
    return;
  }

  saveGuestData({
    ...existing,
    ...updates
  });
}

/**
 * Clear guest user data from localStorage
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return; // SSR safety

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear guest data from localStorage:', error);
  }
}

/**
 * Check if guest data exists
 */
export function hasGuestData(): boolean {
  return getGuestData() !== null;
}

/**
 * Get partial data for form pre-filling
 */
export function getGuestFormData(): {
  email: string;
  firstName: string;
  lastName: string;
} | null {
  const data = getGuestData();
  if (!data) return null;

  return {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName
  };
}