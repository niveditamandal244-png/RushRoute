import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 18000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rushroute_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const details = error.response?.data?.details;
    const fieldErrors = {};
    if (Array.isArray(details)) {
      for (const item of details) {
        if (item?.field && item?.message && !fieldErrors[item.field]) {
          fieldErrors[item.field] = item.message;
        }
      }
    }

    const requestUrl = String(error.config?.url || '');
    const isAuthFormEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/otp/');

    if (
      error.response?.status === 401 &&
      !isAuthFormEndpoint &&
      localStorage.getItem('rushroute_token')
    ) {
      window.dispatchEvent(
        new CustomEvent('rushroute:session-expired', {
          detail: { message: 'Your session has expired. Please sign in again.' }
        })
      );
    }

    const message = !error.response
      ? 'Unable to connect to the server. Please try again.'
      : details?.[0]?.message ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred.';

    error.friendlyMessage = message;
    error.fieldErrors = fieldErrors;
    return Promise.reject(error);
  }
);

export const KNOWN_HUB_SUGGESTIONS = [
  'Majestic (Kempegowda Bus Station / Metro Hub)',
  'MG Road Metro Station',
  'Indiranagar (100 Feet Road / Metro)',
  'Whitefield (Kadugodi / ITPL)',
  'Electronic City Phase 1 (Wipro Gate / Infosys)',
  'Hebbal / Manyata Tech Park',
  'Kempegowda International Airport (BLR)',
  'Bengaluru City Railway Station (KSR Majestic)',
  'Vidhana Soudha (Cubbon Park / Ambedkar Station)',
  'Nagenahalli (Yelahanka North Corridor)',
  'Koramangala (Sony World / 5th Block)',
  'HSR Layout (BDA Complex)',
  'Silk Board Junction',
  'Jayanagar 4th Block',
  'Yeshwanthpur (Metro & Railway Junction)'
];
