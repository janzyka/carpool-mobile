import { create } from 'zustand';
import { deleteRide as apiDeleteRide, listRides, Ride } from '../api/rides';

interface RidesState {
  rides: Ride[];
  loading: boolean;
  error: string | null;
  fetchRides: () => Promise<void>;
  deleteRide: (id: number) => Promise<void>;
}

export const useRidesStore = create<RidesState>((set, get) => ({
  rides: [],
  loading: false,
  error: null,

  fetchRides: async () => {
    if (get().loading) {
      console.log('[rides] fetchRides — skipped (already in flight)');
      return;
    }
    console.log('[rides] fetchRides — starting');
    set({ loading: true, error: null });
    try {
      const rides = await listRides();
      set({ rides, loading: false });
      console.log(`[rides] fetchRides — done, ${rides.length} rides loaded`);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load rides';
      console.error('[rides] fetchRides — failed:', msg);
      set({ loading: false, error: msg });
    }
  },

  deleteRide: async (id: number) => {
    // Optimistically remove from the list immediately.
    set((s) => ({ rides: s.rides.filter((r) => r.id !== id) }));
    try {
      await apiDeleteRide(id);
    } catch (e: any) {
      console.error('[rides] deleteRide — failed, re-fetching to restore state');
      // Restore by re-fetching on failure.
      const rides = await listRides();
      set({ rides });
    }
  },
}));
