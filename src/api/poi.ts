import apiClient from './client';

export interface Poi {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export async function fetchPois(): Promise<Poi[]> {
  console.log('[poi] fetchPois → GET /poi');
  try {
    const { data } = await apiClient.get<Poi[]>('/poi');
    console.log(`[poi] fetchPois ← success (${data.length} POIs)`, data.map((p) => p.name));
    return data;
  } catch (error: any) {
    console.error('[poi] fetchPois ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}


export async function createPoi(name: string, latitude: number, longitude: number): Promise<Poi> {
  const { data } = await apiClient.post<{ id: number }>('/poi', { name, latitude, longitude });
  return { id: data.id, name, latitude, longitude };
}
