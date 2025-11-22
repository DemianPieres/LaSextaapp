import { apiFetch } from './client';

export type BenefitDto = {
  id: string;
  titulo: string;
  descripcionCorta: string;
  descripcionCompleta: string;
  logoUrl: string;
  nombreAuspiciante: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

type BenefitsResponse = {
  benefits: BenefitDto[];
};

type BenefitResponse = {
  benefit: BenefitDto;
};

export type CreateBenefitPayload = {
  titulo: string;
  descripcionCorta: string;
  descripcionCompleta: string;
  logoUrl: string;
  nombreAuspiciante: string;
  activo?: boolean;
};

export type UpdateBenefitPayload = Partial<CreateBenefitPayload>;

export async function fetchBenefits(): Promise<BenefitDto[]> {
  const response = await apiFetch<BenefitsResponse>('/benefits');
  return response.benefits ?? [];
}

export async function fetchAdminBenefits(token: string): Promise<BenefitDto[]> {
  const response = await apiFetch<BenefitsResponse>('/admin/benefits', {
    authToken: token,
  });
  return response.benefits ?? [];
}

export async function createAdminBenefit(token: string, payload: CreateBenefitPayload): Promise<BenefitDto> {
  const response = await apiFetch<BenefitResponse>('/admin/benefits', {
    authToken: token,
    method: 'POST',
    body: payload,
  });
  return response.benefit;
}

export async function updateAdminBenefit(
  token: string,
  benefitId: string,
  payload: UpdateBenefitPayload
): Promise<BenefitDto> {
  const response = await apiFetch<BenefitResponse>(`/admin/benefits/${benefitId}`, {
    authToken: token,
    method: 'PUT',
    body: payload,
  });
  return response.benefit;
}

export async function deleteAdminBenefit(token: string, benefitId: string): Promise<void> {
  await apiFetch<void>(`/admin/benefits/${benefitId}`, {
    authToken: token,
    method: 'DELETE',
  });
}



