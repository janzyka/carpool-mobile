import apiClient from './client';

export interface SocialAuthResponse {
  authKey: string;
  userId: number;
  isNewUser: boolean;
}

export async function socialLogin(
  provider: 'google' | 'apple',
  token: string,
  name?: string,
): Promise<SocialAuthResponse> {
  console.log('[auth] socialLogin → POST /auth/social', { provider });
  try {
    const { data } = await apiClient.post<SocialAuthResponse>('/auth/social', {
      provider,
      token,
      ...(name ? { name } : {}),
    });
    console.log('[auth] socialLogin ← success', { userId: data.userId, isNewUser: data.isNewUser });
    return data;
  } catch (error: any) {
    console.error('[auth] socialLogin ← error', error?.response?.status, error?.response?.data ?? error?.message);
    throw error;
  }
}

