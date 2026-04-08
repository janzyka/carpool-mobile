import { create } from 'zustand';
import apiClient from '../api/client';
import { IncomingInterest } from './requestsStore';

interface AskInterestsState {
  byRideId: Map<number, IncomingInterest[]>;
  loadingRideIds: Set<number>;
  fetchForAsk: (rideId: number) => Promise<void>;
  invalidateAsk: (rideId: number) => void;
}

export const useAskInterestsStore = create<AskInterestsState>((set, get) => ({
  byRideId: new Map(),
  loadingRideIds: new Set(),

  fetchForAsk: async (rideId: number) => {
    if (get().loadingRideIds.has(rideId)) return;

    set((s) => {
      const next = new Set(s.loadingRideIds);
      next.add(rideId);
      return { loadingRideIds: next };
    });

    try {
      const { data } = await apiClient.get<IncomingInterest[]>(`/ride-interests?ride_id=${rideId}`);
      set((s) => {
        const byRideId = new Map(s.byRideId);
        byRideId.set(rideId, data);
        const loadingRideIds = new Set(s.loadingRideIds);
        loadingRideIds.delete(rideId);
        return { byRideId, loadingRideIds };
      });
    } catch {
      set((s) => {
        const loadingRideIds = new Set(s.loadingRideIds);
        loadingRideIds.delete(rideId);
        return { loadingRideIds };
      });
    }
  },

  invalidateAsk: (rideId: number) => {
    set((s) => {
      const byRideId = new Map(s.byRideId);
      byRideId.delete(rideId);
      return { byRideId };
    });
  },
}));
