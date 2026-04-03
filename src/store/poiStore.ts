import { create } from 'zustand';
import { fetchPois, Poi } from '../api/poi';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PoiState {
  pois: Poi[];
  fetchedAt: number | null;   // epoch ms of last successful fetch
  loading: boolean;
  error: string | null;
  syncPois: () => Promise<void>;
}

export const usePoiStore = create<PoiState>((set, get) => ({
  pois: [],
  fetchedAt: null,
  loading: false,
  error: null,

  syncPois: async () => {
    const { fetchedAt, loading } = get();

    if (loading) {
      console.log('[poi] syncPois — skipped (fetch already in flight)');
      return;
    }

    if (fetchedAt !== null && Date.now() - fetchedAt < TTL_MS) {
      const ageSeconds = Math.round((Date.now() - fetchedAt) / 1000);
      console.log(`[poi] syncPois — skipped (cache fresh, age ${ageSeconds}s)`);
      return;
    }

    console.log('[poi] syncPois — starting fetch');
    set({ loading: true, error: null });
    try {
      const pois = await fetchPois();
      set({ pois, fetchedAt: Date.now(), loading: false });
      console.log(`[poi] syncPois — done, ${pois.length} POIs cached`);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load locations';
      console.error('[poi] syncPois — failed:', msg);
      set({ loading: false, error: msg });
    }
  },
}));
