import axios from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
console.log('[client] BASE_URL:', BASE_URL);

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth_key to every request when available
apiClient.interceptors.request.use((config) => {
  const { authKey } = useAuthStore.getState();
  if (authKey) {
    config.headers.Authorization = `Bearer ${authKey}`;
  }
  return config;
});

// Auto-logout on 401 — clears stale keychain credentials and returns to login.
// Returns a never-resolving promise so the error never propagates to the calling
// store — preventing error toasts from firing during the navigation transition.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await useAuthStore.getState().clearAuth();
      router.replace('/register');
      return new Promise(() => {});
    }
    return Promise.reject(error);
  },
);

export default apiClient;
