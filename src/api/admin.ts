import { apiFetch } from './client';

export type AdminUserSummary = {
  id: string;
  nombre: string;
  email: string;
  rol: 'cliente';
  fechaRegistro: string;
  ticketsActivos: number;
};

export type AdminTicket = {
  id: string;
  codigoQR: string;
  estado: 'valido' | 'usado' | 'expirado';
  fechaCreacion: string;
  fechaVencimiento: string | null;
  fechaUso: string | null;
  emitidoPor: string | null;
  usuario?: {
    nombre: string;
    email: string;
  };
};

type AdminUsersResponse = {
  users: AdminUserSummary[];
};

type AdminTicketsResponse = {
  tickets: AdminTicket[];
};

type GenerateTicketResponse = {
  ticket: {
    id: string;
    codigoQR: string;
    estado: 'valido';
    fechaCreacion: string;
    fechaVencimiento: string | null;
  };
};

export async function fetchAdminUsers(token: string): Promise<AdminUserSummary[]> {
  const response = await apiFetch<AdminUsersResponse>('/admin/users', {
    authToken: token,
  });
  return response.users ?? [];
}

export async function fetchAdminTickets(token: string, estado?: 'valido' | 'usado' | 'expirado'): Promise<AdminTicket[]> {
  const params = estado ? `?estado=${estado}` : '';
  const response = await apiFetch<AdminTicketsResponse>(`/admin/tickets/all${params}`, {
    authToken: token,
  });
  return response.tickets ?? [];
}

export async function fetchAdminTicketsByUser(token: string, userId: string): Promise<AdminTicket[]> {
  const response = await apiFetch<AdminTicketsResponse>(`/admin/tickets/user/${userId}`, {
    authToken: token,
  });
  return response.tickets ?? [];
}

export async function generateTicketForUser(
  token: string,
  payload: { userId: string; diasValidez?: number }
): Promise<GenerateTicketResponse['ticket']> {
  const response = await apiFetch<GenerateTicketResponse>('/admin/tickets/generate', {
    authToken: token,
    method: 'POST',
    body: payload,
  });
  return response.ticket;
}

export async function sendTicketEmail(token: string, payload: { userId: string; ticketId: string }): Promise<void> {
  await apiFetch<{ message: string }>(`/admin/tickets/send/${payload.userId}`, {
    authToken: token,
    method: 'POST',
    body: { ticketId: payload.ticketId },
  });
}

export async function markTicketAsUsed(token: string, ticketId: string): Promise<void> {
  await apiFetch<{ ticket: AdminTicket }>(`/admin/tickets/use/${ticketId}`, {
    authToken: token,
    method: 'PUT',
  });
}

export async function validateTicketByCode(token: string, codigoQR: string): Promise<AdminTicket> {
  const response = await apiFetch<{ ticket: AdminTicket }>(`/admin/tickets/validate/${codigoQR}`, {
    authToken: token,
    method: 'POST',
  });
  return response.ticket;
}



