import axios from 'axios';
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

export default apiClient;
