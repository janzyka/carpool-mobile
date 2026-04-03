import { create } from 'zustand';
import apiClient from '../api/client';

export interface RideInterest {
  rideId: number;
  userId: number;
  status: number;  // 0=pending, 1=accepted, 2=declined
  created: string;
  updated: string;
}

interface MyInterestsState {
  // rideId → interest status
  byRideId: Map<number, RideInterest>;
  loading: boolean;
  fetchMyInterests: (userId: number) => Promise<void>;
}

export const useMyInterestsStore = create<MyInterestsState>((set, get) => ({
  byRideId: new Map(),
  loading: false,

  fetchMyInterests: async (userId: number) => {
    if (get().loading) return;
    console.log(`[interests] fetchMyInterests → GET /ride-interests?created_by=${userId}`);
    set({ loading: true });
    try {
      const { data } = await apiClient.get<RideInterest[]>(`/ride-interests?created_by=${userId}`);
      const byRideId = new Map(data.map((i) => [i.rideId, i]));
      set({ byRideId, loading: false });
      console.log(`[interests] fetchMyInterests ← ${data.length} interest(s)`);
    } catch (error: any) {
      console.error('[interests] fetchMyInterests ← error', error?.response?.status, error?.response?.data ?? error?.message);
      set({ loading: false });
    }
  },
}));
