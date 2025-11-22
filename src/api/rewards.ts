import { apiFetch } from './client';

export type RewardDto = {
  id: string;
  nombre: string;
  puntosRequeridos: number;
  descripcion: string;
  imagenUrl: string | null;
  habilitado: boolean;
  createdAt: string;
  updatedAt: string;
};

type RewardsResponse = {
  rewards: RewardDto[];
};

type RewardResponse = {
  reward: RewardDto;
};

type CreateRewardPayload = {
  nombre: string;
  puntosRequeridos: number;
  descripcion: string;
  imagenUrl?: string;
  habilitado?: boolean;
};

type UpdateRewardPayload = Partial<CreateRewardPayload>;

// ===== CLIENTE =====

export async function fetchRewards(): Promise<RewardDto[]> {
  const response = await apiFetch<RewardsResponse>('/rewards');
  return response.rewards ?? [];
}

// ===== ADMIN =====

export async function fetchAdminRewards(token: string): Promise<RewardDto[]> {
  const response = await apiFetch<RewardsResponse>('/admin/rewards', {
    authToken: token,
  });
  return response.rewards ?? [];
}

export async function createAdminReward(token: string, payload: CreateRewardPayload): Promise<RewardDto> {
  const response = await apiFetch<RewardResponse>('/admin/rewards', {
    authToken: token,
    method: 'POST',
    body: payload,
  });
  return response.reward;
}

export async function updateAdminReward(token: string, rewardId: string, payload: UpdateRewardPayload): Promise<RewardDto> {
  const response = await apiFetch<RewardResponse>(`/admin/rewards/${rewardId}`, {
    authToken: token,
    method: 'PUT',
    body: payload,
  });
  return response.reward;
}

export async function deleteAdminReward(token: string, rewardId: string): Promise<void> {
  await apiFetch(`/admin/rewards/${rewardId}`, {
    authToken: token,
    method: 'DELETE',
  });
}

