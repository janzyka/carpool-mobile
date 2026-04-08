import { create } from 'zustand';
import { listAsks, Ride } from '../api/rides';

interface AsksState {
  asks: Ride[];
  loading: boolean;
  error: string | null;
  fetchAsks: () => Promise<void>;
}

export const useAsksStore = create<AsksState>((set, get) => ({
  asks: [],
  loading: false,
  error: null,

  fetchAsks: async () => {
    if (get().loading) {
      console.log('[asks] fetchAsks — skipped (already in flight)');
      return;
    }
    console.log('[asks] fetchAsks — starting');
    set({ loading: true, error: null });
    try {
      const asks = await listAsks();
      set({ asks, loading: false });
      console.log(`[asks] fetchAsks — done, ${asks.length} asks loaded`);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load asks';
      console.error('[asks] fetchAsks — failed:', msg);
      set({ loading: false, error: msg });
    }
  },
}));
