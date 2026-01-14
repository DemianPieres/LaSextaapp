import { apiFetch } from './client';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: 'admin' | 'cliente';
    fechaRegistro: string;
  };
  token: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  nombre: string;
};

export type RegisterResponse = LoginResponse;

export type MeResponse = {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: 'admin' | 'cliente';
    fechaRegistro: string;
  };
};

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me', {
    method: 'GET',
    authToken: token,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  token: string
): Promise<void> {
  await apiFetch<void>('/auth/change-password', {
    method: 'POST',
    authToken: token,
    body: {
      currentPassword,
      newPassword,
    },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  return apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyResetCode(email: string, code: string): Promise<void> {
  return apiFetch<void>('/auth/verify-reset-code', {
    method: 'POST',
    body: { email, code },
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  });
}
