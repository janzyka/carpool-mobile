import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

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
