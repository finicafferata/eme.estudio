// API configuration for different environments
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Helper function to get the full API URL
export function getApiUrl(endpoint: string): string {
  // If we have a custom API URL (like Railway backend), use it
  if (API_BASE_URL) {
    return `${API_BASE_URL}${endpoint}`
  }

  // Otherwise, use relative URLs (same domain)
  return endpoint
}

// Common fetch wrapper with proper URL handling
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = getApiUrl(endpoint)
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
}