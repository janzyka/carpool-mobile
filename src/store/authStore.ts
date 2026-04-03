import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY_AUTH_KEY = 'carpool_auth_key';
const KEY_USER_ID  = 'carpool_user_id';

interface AuthState {
  authKey: string | null;
  userId: number | null;
  isLoading: boolean;
  loadAuth: () => Promise<void>;
  setAuth: (authKey: string, userId: number) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authKey: null,
  userId: null,
  isLoading: true,

  loadAuth: async () => {
    const [authKey, rawUserId] = await Promise.all([
      SecureStore.getItemAsync(KEY_AUTH_KEY),
      SecureStore.getItemAsync(KEY_USER_ID),
    ]);
    set({
      authKey,
      userId: rawUserId ? parseInt(rawUserId, 10) : null,
      isLoading: false,
    });
  },

  setAuth: async (authKey, userId) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_AUTH_KEY, authKey),
      SecureStore.setItemAsync(KEY_USER_ID, String(userId)),
    ]);
    set({ authKey, userId });
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_AUTH_KEY),
      SecureStore.deleteItemAsync(KEY_USER_ID),
    ]);
    set({ authKey: null, userId: null });
  },
}));
