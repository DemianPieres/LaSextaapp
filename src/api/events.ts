import { apiFetch, resolveApiUrl } from './client';

export type EventDto = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  dia: string;
  ubicacion: string;
  descripcion: string | null;
  imagenFondo: string | null;
  linkCompra: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventsResponse = {
  events: EventDto[];
};

type EventResponse = {
  event: EventDto;
};

export type CreateEventPayload = {
  titulo: string;
  fecha: string;
  hora: string;
  dia: string;
  ubicacion?: string;
  descripcion?: string;
  imagenFondo?: string;
  linkCompra?: string;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;

export type EventStreamMessage =
  | { type: 'snapshot'; events: EventDto[] }
  | { type: 'created' | 'updated'; event: EventDto }
  | { type: 'deleted'; eventId: string }
  | { type: 'ping'; at: number };

export async function fetchEvents(): Promise<EventDto[]> {
  const response = await apiFetch<EventsResponse>('/events');
  return response.events ?? [];
}

export async function fetchAdminEvents(token: string): Promise<EventDto[]> {
  const response = await apiFetch<EventsResponse>('/admin/events', {
    authToken: token,
  });
  return response.events ?? [];
}

export async function createAdminEvent(token: string, payload: CreateEventPayload): Promise<EventDto> {
  const response = await apiFetch<EventResponse>('/admin/events', {
    authToken: token,
    method: 'POST',
    body: payload,
  });
  return response.event;
}

export async function updateAdminEvent(
  token: string,
  eventId: string,
  payload: UpdateEventPayload
): Promise<EventDto> {
  const response = await apiFetch<EventResponse>(`/admin/events/${eventId}`, {
    authToken: token,
    method: 'PUT',
    body: payload,
  });
  return response.event;
}

export async function deleteAdminEvent(token: string, eventId: string): Promise<void> {
  await apiFetch<void>(`/admin/events/${eventId}`, {
    authToken: token,
    method: 'DELETE',
  });
}

export function subscribeToEventStream(
  onMessage: (message: EventStreamMessage) => void,
  onError?: (event: MessageEvent) => void
): EventSource {
  const url = resolveApiUrl('/events/stream');
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as EventStreamMessage;
      onMessage(data);
    } catch (error) {
      console.error('[events] Error al parsear mensaje SSE:', error);
    }
  };

  if (onError) {
    eventSource.onerror = onError;
  }

  return eventSource;
}


