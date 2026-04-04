import { create } from 'zustand';
import { fetchUser, UserSummary } from '../api/users';

interface UserCacheState {
  cache: Map<number, UserSummary>;
  // Track in-flight requests to avoid duplicate concurrent fetches
  fetching: Set<number>;
  getUser: (id: number) => UserSummary | undefined;
  ensureUser: (id: number) => Promise<void>;
  refreshUser: (id: number) => Promise<void>;
}

export const useUserCacheStore = create<UserCacheState>((set, get) => ({
  cache: new Map(),
  fetching: new Set(),

  getUser: (id: number) => get().cache.get(id),

  refreshUser: async (id: number) => {
    try {
      const user = await fetchUser(id);
      set((s) => {
        const nextCache = new Map(s.cache);
        nextCache.set(id, user);
        return { cache: nextCache };
      });
    } catch {
      // best-effort — leave stale cache in place
    }
  },

  ensureUser: async (id: number) => {
    const { cache, fetching } = get();
    if (cache.has(id) || fetching.has(id)) return;

    const nextFetching = new Set(fetching);
    nextFetching.add(id);
    set({ fetching: nextFetching });

    try {
      const user = await fetchUser(id);
      set((s) => {
        const nextCache = new Map(s.cache);
        nextCache.set(id, user);
        const nextFetch = new Set(s.fetching);
        nextFetch.delete(id);
        return { cache: nextCache, fetching: nextFetch };
      });
    } catch {
      set((s) => {
        const nextFetch = new Set(s.fetching);
        nextFetch.delete(id);
        return { fetching: nextFetch };
      });
    }
  },
}));
