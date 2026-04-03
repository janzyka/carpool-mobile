import apiClient from './client';

export interface RegisterResponse {
  id: number;
  message: string;
}

export interface VerifyResponse {
  authKey: string;
  message: string;
}

export async function registerUser(
  name: string,
  phoneNumber: string,
  icon?: string,
): Promise<RegisterResponse> {
  console.log('[auth] registerUser → POST /users', { name, phoneNumber, hasIcon: !!icon });
  try {
    const { data } = await apiClient.post<RegisterResponse>('/users', {
      name,
      phoneNumber,
      ...(icon ? { icon } : {}),
    });
    console.log('[auth] registerUser ← success', data);
    return data;
  } catch (error: any) {
    console.error('[auth] registerUser ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

export async function verifyUser(
  userId: number,
  verificationCode: number,
): Promise<VerifyResponse> {
  console.log(`[auth] verifyUser → POST /users/${userId}/verify`, { userId, verificationCode });
  try {
    const { data } = await apiClient.post<VerifyResponse>(
      `/users/${userId}/verify`,
      { verificationCode },
    );
    console.log('[auth] verifyUser ← success', data);
    return data;
  } catch (error: any) {
    console.error('[auth] verifyUser ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}
