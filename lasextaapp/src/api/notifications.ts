import { apiFetch } from './client';

export type NotificationDto = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  metadata?: Record<string, unknown>;
};

type NotificationsResponse = {
  notifications: NotificationDto[];
};

type UnreadCountResponse = {
  count: number;
};

type CleanupResponse = {
  deletedCount: number;
};

/**
 * Obtiene las notificaciones del usuario autenticado.
 */
export async function fetchUserNotifications(token: string): Promise<NotificationDto[]> {
  const response = await apiFetch<NotificationsResponse>('/notifications/me', {
    authToken: token,
  });
  return response.notifications ?? [];
}

/**
 * Devuelve la cantidad de notificaciones no leídas del usuario autenticado.
 */
export async function getUnreadNotificationsCount(token: string): Promise<number> {
  const response = await apiFetch<UnreadCountResponse>('/notifications/me/unread-count', {
    authToken: token,
  });
  return response.count ?? 0;
}

/**
 * Marca como leídas las notificaciones del usuario.
 * Si se pasa un arreglo de IDs, marca solo esas; si no, marca todas.
 */
export async function markNotificationsAsRead(
  token: string,
  notificationIds?: string[]
): Promise<void> {
  await apiFetch<void>('/notifications/me/mark-read', {
    authToken: token,
    method: 'PATCH',
    body: notificationIds && notificationIds.length > 0 ? { notificationIds } : {},
  });
}

/**
 * Elimina del servidor las notificaciones antiguas del usuario
 * (actualmente, las de más de 1 minuto).
 */
export async function cleanupOldNotifications(token: string): Promise<number> {
  const response = await apiFetch<CleanupResponse>('/notifications/me/cleanup', {
    authToken: token,
    method: 'DELETE',
  });
  return response.deletedCount ?? 0;
}

/**
 * Suscripción muy sencilla a nuevas notificaciones.
 * Implementa un polling liviano para detectar notificaciones nuevas
 * y disparar el callback cuando aparezcan.
 */
export function subscribeToNotifications(
  token: string,
  onNotification: (notification: NotificationDto) => void
): () => void {
  let cancelled = false;
  const seenIds = new Set<string>();

  // Cargar estado inicial sin disparar notificaciones
  void (async () => {
    try {
      const existing = await fetchUserNotifications(token);
      for (const n of existing) {
        seenIds.add(n.id);
      }
    } catch (error) {
      // Error al cargar notificaciones - no crítico
    }
  })();

  const intervalId = window.setInterval(async () => {
    if (cancelled) {
      return;
    }
    try {
      const latest = await fetchUserNotifications(token);
      for (const n of latest) {
        if (!seenIds.has(n.id)) {
          seenIds.add(n.id);
          onNotification(n);
        }
      }
    } catch (error) {
      // Error en polling - no crítico, se reintentará
    }
  }, 30000); // cada 30s

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}


