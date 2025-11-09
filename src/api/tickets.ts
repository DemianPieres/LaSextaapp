import { apiFetch } from './client';

export type TicketStatus = 'valido' | 'usado' | 'expirado';

export type TicketDto = {
  id: string;
  usuarioId: string;
  codigoQR: string;
  estado: TicketStatus;
  fechaCreacion: string;
  fechaVencimiento: string | null;
  fechaUso: string | null;
  emitidoPor: string | null;
};

type TicketsResponse = {
  tickets: TicketDto[];
};

export async function fetchActiveTickets(userId: string, token: string): Promise<TicketDto[]> {
  const response = await apiFetch<TicketsResponse>(`/tickets/users/${userId}/active`, {
    authToken: token,
  });
  return response.tickets ?? [];
}

export async function fetchTicketsHistory(userId: string, token: string): Promise<TicketDto[]> {
  const response = await apiFetch<TicketsResponse>(`/tickets/users/${userId}/history`, {
    authToken: token,
  });
  return response.tickets ?? [];
}



