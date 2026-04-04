import { create } from 'zustand';
import { deleteVehicle as apiDeleteVehicle, getVehicle, listVehicles, VehicleDto } from '../api/vehicles';

interface VehiclesState {
  vehicles: VehicleDto[];
  loading: boolean;
  fetchVehicles: (userId: number) => Promise<void>;
  addVehicle: (vehicle: VehicleDto) => void;
  removeVehicle: (vehicleId: number) => Promise<void>;
  // Cache for vehicles owned by other users (fetched on demand).
  vehicleCache: Map<number, VehicleDto>;
  fetchingVehicleIds: Set<number>;
  ensureVehicle: (vehicleId: number) => Promise<void>;
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  loading: false,
  vehicleCache: new Map(),
  fetchingVehicleIds: new Set(),

  fetchVehicles: async (userId: number) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const vehicles = await listVehicles(userId);
      set({ vehicles: vehicles.filter((v) => !v.disabled), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addVehicle: (vehicle: VehicleDto) => {
    set((s) => ({ vehicles: [...s.vehicles, vehicle] }));
  },

  removeVehicle: async (vehicleId: number) => {
    // Optimistically remove immediately.
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== vehicleId) }));
    try {
      await apiDeleteVehicle(vehicleId);
    } catch {
      console.error('[vehicles] removeVehicle — API call failed');
      // State already updated optimistically; caller can show an error and reload if needed.
    }
  },

  ensureVehicle: async (vehicleId: number) => {
    const { vehicleCache, fetchingVehicleIds } = get();
    if (vehicleCache.has(vehicleId) || fetchingVehicleIds.has(vehicleId)) return;
    set((s) => ({ fetchingVehicleIds: new Set([...s.fetchingVehicleIds, vehicleId]) }));
    try {
      const vehicle = await getVehicle(vehicleId);
      set((s) => {
        const newCache = new Map(s.vehicleCache);
        newCache.set(vehicleId, vehicle);
        const newFetching = new Set(s.fetchingVehicleIds);
        newFetching.delete(vehicleId);
        return { vehicleCache: newCache, fetchingVehicleIds: newFetching };
      });
    } catch {
      set((s) => {
        const newFetching = new Set(s.fetchingVehicleIds);
        newFetching.delete(vehicleId);
        return { fetchingVehicleIds: newFetching };
      });
    }
  },
}));
