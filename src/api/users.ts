import apiClient from './client';

export interface UserSummary {
  id: number;
  name: string;
  icon: string | null;        // base64-encoded image, or null if not set
  phoneNumber: string | null;
}

export interface PatchUserPayload {
  name?: string;
  pushToken?: string;
  icon?: string;        // base64-encoded image
}

export async function patchUser(id: number, payload: PatchUserPayload): Promise<void> {
  console.log(`[users] patchUser → PATCH /users/${id}`, Object.keys(payload));
  try {
    await apiClient.patch(`/users/${id}`, payload);
    console.log(`[users] patchUser ← success`);
  } catch (error: any) {
    console.error(`[users] patchUser ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function fetchUser(id: number): Promise<UserSummary> {
  console.log(`[users] fetchUser → GET /users/${id}`);
  try {
    const { data } = await apiClient.get<UserSummary>(`/users/${id}`);
    console.log(`[users] fetchUser ← success (name=${data.name}, hasIcon=${data.icon !== null})`);
    return data;
  } catch (error: any) {
    console.error(`[users] fetchUser ← error`, error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}
