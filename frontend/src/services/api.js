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
    const message =
      error.response?.data?.details?.[0]?.message ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export const KNOWN_HUB_SUGGESTIONS = [
  'Indiranagar (100 Feet Road / Metro)',
  'Whitefield (Kadugodi / ITPL)',
  'MG Road Metro Station',
  'Majestic (Kempegowda Bus Station / Metro Hub)',
  'Koramangala (Sony World / 5th Block)',
  'Electronic City Phase 1 (Wipro Gate / Infosys)',
  'HSR Layout (BDA Complex)',
  'Silk Board Junction',
  'Jayanagar 4th Block',
  'Yeshwanthpur (Metro & Railway Junction)',
  'Hebbal / Manyata Tech Park',
  'Kempegowda International Airport (BLR)'
];
