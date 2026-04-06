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
