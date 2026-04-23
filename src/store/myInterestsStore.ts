import { create } from 'zustand';
import apiClient from '../api/client';

export interface RideInterest {
  id: number;
  rideId: number;
  userId: number;
  driverResponse: number;  // 0=pending, 1=accepted, 2=declined, 3=cancelled by driver
  status: number;          // 0=new, 1=cancelled by user
  created: string;
  updated: string;
}

interface MyInterestsState {
  // rideId → interest
  byRideId: Map<number, RideInterest>;
  loading: boolean;
  fetchMyInterests: (userId: number) => Promise<void>;
}

export const useMyInterestsStore = create<MyInterestsState>((set, get) => ({
  byRideId: new Map(),
  loading: false,

  reset: () => set({ byRideId: new Map(), loading: false }),

  fetchMyInterests: async (userId: number) => {
    if (get().loading) return;
    console.log(`[interests] fetchMyInterests → GET /ride-interests?created_by=${userId}`);
    set({ loading: true });
    try {
      const { data } = await apiClient.get<RideInterest[]>(`/ride-interests?created_by=${userId}`);
      // For each ride there may be multiple interests (cancelled + re-created).
      // At most one can be active (status=0); always prefer it over cancelled ones.
      const byRideId = new Map<number, RideInterest>();
      for (const interest of data) {
        const existing = byRideId.get(interest.rideId);
        if (!existing || interest.status === 0) {
          byRideId.set(interest.rideId, interest);
        }
      }
      set({ byRideId, loading: false });
      console.log(`[interests] fetchMyInterests ← ${data.length} interest(s)`);
    } catch (error: any) {
      console.error('[interests] fetchMyInterests ← error', error?.response?.status, error?.response?.data ?? error?.message);
      set({ loading: false });
    }
  },
}));
