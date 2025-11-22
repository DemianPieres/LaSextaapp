import { apiFetch } from './client';

export type NotificationDto = {
  id: string;
  tipo: 'evento' | 'ticket' | 'puntos';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  metadata?: {
    eventoId?: string;
    ticketId?: string;
    puntos?: number;
  };
};

type NotificationsResponse = {
  notifications: NotificationDto[];
};

type UnreadCountResponse = {
  count: number;
};

export async function fetchNotifications(token: string): Promise<NotificationDto[]> {
  const response = await apiFetch<NotificationsResponse>('/notifications/me', {
    authToken: token,
  });
  return response.notifications ?? [];
}

export async function getUnreadNotificationsCount(token: string): Promise<number> {
  const response = await apiFetch<UnreadCountResponse>('/notifications/me/unread-count', {
    authToken: token,
  });
  return response.count ?? 0;
}

export async function markNotificationsAsRead(
  token: string,
  notificationIds?: string[]
): Promise<void> {
  await apiFetch('/notifications/me/mark-read', {
    authToken: token,
    method: 'PATCH',
    body: notificationIds ? { notificationIds } : {},
  });
}

// Suscripción a notificaciones usando polling (cada 30 segundos)
export function subscribeToNotifications(
  token: string,
  onNotification: (notification: NotificationDto) => void
): () => void {
  let isActive = true;
  let lastCheck = Date.now();

  const pollNotifications = async () => {
    if (!isActive) return;

    try {
      const notifications = await fetchNotifications(token);
      // Solo procesar notificaciones nuevas (creadas después del último check)
      const newNotifications = notifications.filter(
        (n) => new Date(n.fechaCreacion).getTime() > lastCheck && !n.leida
      );

      for (const notification of newNotifications) {
        onNotification(notification);
      }

      lastCheck = Date.now();
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    }

    if (isActive) {
      setTimeout(pollNotifications, 30000); // Poll cada 30 segundos
    }
  };

  // Iniciar polling
  void pollNotifications();

  // Retornar función de limpieza
  return () => {
    isActive = false;
  };
}

