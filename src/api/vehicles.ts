import apiClient from './client';

export interface VehicleDto {
  id: number;
  userId: number;
  name: string;
  icon: string | null;         // base64-encoded image, or null
  plateNumber: string | null;
  seats: number | null;
  created: string;
}

export interface CreateVehiclePayload {
  name: string;
  icon?: string;               // base64-encoded image
  plateNumber?: string;
  seats?: number;
}

export async function listVehicles(userId: number): Promise<VehicleDto[]> {
  console.log(`[vehicles] listVehicles → GET /users/${userId}/vehicles`);
  try {
    const { data } = await apiClient.get<VehicleDto[]>(`/users/${userId}/vehicles`);
    console.log(`[vehicles] listVehicles ← ${data.length} vehicles`);
    return data;
  } catch (error: any) {
    console.error(`[vehicles] listVehicles ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function deleteVehicle(vehicleId: number): Promise<void> {
  console.log(`[vehicles] deleteVehicle → DELETE /vehicles/${vehicleId}`);
  try {
    await apiClient.delete(`/vehicles/${vehicleId}`);
    console.log(`[vehicles] deleteVehicle ← success`);
  } catch (error: any) {
    console.error(`[vehicles] deleteVehicle ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function getVehicle(vehicleId: number): Promise<VehicleDto> {
  console.log(`[vehicles] getVehicle → GET /vehicles/${vehicleId}`);
  try {
    const { data } = await apiClient.get<VehicleDto>(`/vehicles/${vehicleId}`);
    console.log(`[vehicles] getVehicle ← id=${data.id}`);
    return data;
  } catch (error: any) {
    console.error(`[vehicles] getVehicle ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function createVehicle(userId: number, payload: CreateVehiclePayload): Promise<VehicleDto> {
  console.log(`[vehicles] createVehicle → POST /users/${userId}/vehicles`, payload.name);
  try {
    const { data } = await apiClient.post<VehicleDto>(`/users/${userId}/vehicles`, payload);
    console.log(`[vehicles] createVehicle ← id=${data.id}`);
    return data;
  } catch (error: any) {
    console.error(`[vehicles] createVehicle ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}
