import { apiFetch } from './client';

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyResetCode(email: string, code: string): Promise<{ valid: boolean }> {
  return await apiFetch<{ valid: boolean }>('/auth/verify-reset-code', {
    method: 'POST',
    body: { email, code },
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  });
}

