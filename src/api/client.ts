import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// TODO: replace with your deployed API Gateway base URL
const BASE_URL = 'https://5pqwkyomu6.execute-api.eu-central-1.amazonaws.com/dev';

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
