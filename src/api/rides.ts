import apiClient from './client';

export interface Ride {
  id: number;
  userId: number;
  departsFrom: number;
  leadsTo: number;
  departure: string;   // local datetime string: "2024-06-01T08:00:00"
  status: number;
  created: string;
}

export interface SubmitRideResponse {
  id: number;
  created: string;
  message: string;
}

export async function deleteRide(id: number): Promise<void> {
  console.log(`[rides] deleteRide → DELETE /rides/${id}`);
  try {
    await apiClient.delete(`/rides/${id}`);
    console.log(`[rides] deleteRide ← success (id=${id})`);
  } catch (error: any) {
    console.error('[rides] deleteRide ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function listRides(): Promise<Ride[]> {
  console.log('[rides] listRides → GET /rides');
  try {
    const { data } = await apiClient.get<Ride[]>('/rides');
    console.log(`[rides] listRides ← success (${data.length} rides)`);
    return data;
  } catch (error: any) {
    console.error('[rides] listRides ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

// departure must be ISO-8601 local datetime: "2024-06-01T08:00:00"
export async function submitRide(
  departsFrom: number,
  leadsTo: number,
  departure: Date,
): Promise<SubmitRideResponse> {
  // Format as local ISO-8601 without timezone offset ("2024-06-01T08:00:00")
  const pad = (n: number) => String(n).padStart(2, '0');
  const departureStr = `${departure.getFullYear()}-${pad(departure.getMonth() + 1)}-${pad(departure.getDate())}` +
    `T${pad(departure.getHours())}:${pad(departure.getMinutes())}:00`;

  const { data } = await apiClient.post<SubmitRideResponse>('/rides', {
    departsFrom,
    leadsTo,
    departure: departureStr,
  });
  return data;
}
