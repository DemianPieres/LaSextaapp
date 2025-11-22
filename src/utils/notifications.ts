import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

type NotificationOptions = {
  title: string;
  body: string;
  id: number;
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // En web, usar la API de notificaciones del navegador
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error al solicitar permisos de notificaciones:', error);
    return false;
  }
}

export async function scheduleLocalNotification(options: NotificationOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // En web, usar la API de notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: '/logosexta.png',
        badge: '/logosexta.png',
      });
    }
    return;
  }

  try {
    // Verificar permisos primero
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('Permisos de notificaciones no otorgados');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: options.title,
          body: options.body,
          id: options.id,
          sound: 'default',
          attachments: undefined,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  } catch (error) {
    console.error('Error al programar notificación local:', error);
  }
}

// Inicializar permisos al cargar la app
export async function initializeNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await requestNotificationPermission();
  } else if ('Notification' in window && Notification.permission === 'default') {
    // En web, solo solicitar permisos si el usuario aún no ha decidido
    await Notification.requestPermission();
  }
}

