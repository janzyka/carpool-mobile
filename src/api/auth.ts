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
  const { data } = await apiClient.post<RegisterResponse>('/users', {
    name,
    phoneNumber,
    ...(icon ? { icon } : {}),
  });
  return data;
}

export async function verifyUser(
  userId: number,
  verificationCode: number,
): Promise<VerifyResponse> {
  const { data } = await apiClient.post<VerifyResponse>(
    `/users/${userId}/verify`,
    { verificationCode },
  );
  return data;
}
