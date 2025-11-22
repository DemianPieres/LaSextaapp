import { apiFetch } from './client';

export type PointsMovement = {
  id: string;
  tipo: 'carga' | 'canje';
  cantidad: number;
  descripcion: string;
  fecha: string;
};

export type RedeemCodeResponse = {
  codigo: string;
  puntosACanjear: number;
  rewardId?: string;
  fechaExpiracion: string;
};

type PointsResponse = {
  puntos: number;
};

type MovementsResponse = {
  movements: PointsMovement[];
};

type AddPointResponse = {
  message: string;
  nuevosPuntos: number;
};

export type ValidateRedeemResponse = {
  message: string;
  usuario: string;
  puntosCanjeados: number;
  puntosRestantes: number;
  reward?: {
    id: string;
    nombre: string;
    puntosRequeridos: number;
    descripcion: string;
    imagenUrl: string | null;
    habilitado: boolean;
  };
};

type EligibilityResponse = {
  canAddToday: boolean;
};

// ===== CLIENTE =====

export async function fetchUserPoints(token: string): Promise<number> {
  const response = await apiFetch<PointsResponse>('/points/me', {
    authToken: token,
  });
  return response.puntos ?? 0;
}

export async function fetchUserMovements(token: string): Promise<PointsMovement[]> {
  const response = await apiFetch<MovementsResponse>('/points/movements', {
    authToken: token,
  });
  return response.movements ?? [];
}

export async function generateRedeemCode(token: string, rewardId: string): Promise<RedeemCodeResponse> {
  const response = await apiFetch<RedeemCodeResponse>('/points/generate-redeem-code', {
    authToken: token,
    method: 'POST',
    body: { rewardId },
  });
  return response;
}

// ===== ADMIN =====

export async function addPointToUser(token: string, usuarioId: string): Promise<AddPointResponse> {
  const response = await apiFetch<AddPointResponse>('/admin/points/add', {
    authToken: token,
    method: 'POST',
    body: { usuarioId },
  });
  return response;
}

export async function validateRedeemCode(token: string, codigo: string): Promise<ValidateRedeemResponse> {
  const response = await apiFetch<ValidateRedeemResponse>('/admin/points/validate-redeem', {
    authToken: token,
    method: 'POST',
    body: { codigo },
  });
  return response;
}

export async function checkPointEligibility(token: string, usuarioId: string): Promise<boolean> {
  const response = await apiFetch<EligibilityResponse>(`/admin/points/check-eligibility/${usuarioId}`, {
    authToken: token,
  });
  return response.canAddToday ?? false;
}



