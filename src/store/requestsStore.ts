import { create } from 'zustand';
import apiClient from '../api/client';

export interface IncomingInterest {
  id: number;
  rideId: number;
  userId: number;   // the person who expressed interest
  status: number;   // 0=pending, 1=accepted, 2=declined
  created: string;
  updated: string;
}

interface RequestsState {
  interests: IncomingInterest[];
  loading: boolean;
  error: string | null;
  fetchRequests: (userId: number) => Promise<void>;
}

export const useRequestsStore = create<RequestsState>((set, get) => ({
  interests: [],
  loading: false,
  error: null,

  fetchRequests: async (userId: number) => {
    if (get().loading) return;
    console.log(`[requests] fetchRequests → GET /ride-interests?created_for=${userId}`);
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get<IncomingInterest[]>(`/ride-interests?created_for=${userId}`);
      set({ interests: data, loading: false });
      console.log(`[requests] fetchRequests ← ${data.length} request(s)`);
    } catch (error: any) {
      const msg = error?.message ?? 'Failed to load requests';
      console.error('[requests] fetchRequests ← error', error?.response?.status, error?.response?.data ?? msg);
      set({ loading: false, error: msg });
    }
  },
}));
