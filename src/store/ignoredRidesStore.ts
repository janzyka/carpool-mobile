import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'ignored_ride_ids';

interface IgnoredRidesState {
  ignoredIds: Set<number>;
  loaded: boolean;
  loadIgnored: () => Promise<void>;
  ignoreRide: (id: number) => Promise<void>;
}

export const useIgnoredRidesStore = create<IgnoredRidesState>((set, get) => ({
  ignoredIds: new Set(),
  loaded: false,

  loadIgnored: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      set({ ignoredIds: new Set(ids), loaded: true });
      console.log(`[ignored] loaded ${ids.length} ignored ride id(s)`);
    } catch (e) {
      console.error('[ignored] failed to load ignored rides', e);
      set({ loaded: true });
    }
  },

  ignoreRide: async (id: number) => {
    const next = new Set(get().ignoredIds);
    next.add(id);
    set({ ignoredIds: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      console.log(`[ignored] ride ${id} ignored and persisted`);
    } catch (e) {
      console.error('[ignored] failed to persist ignored ride', e);
    }
  },
}));
