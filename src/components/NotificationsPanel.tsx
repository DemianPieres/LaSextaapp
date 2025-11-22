import React, { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonContent,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
} from '@ionic/react';
import { closeOutline, ticketOutline, calendarOutline, starOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationsAsRead, type NotificationDto } from '../api/notifications';
import './NotificationsPanel.css';

type NotificationsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.type === 'user' ? session.token : null;

  useEffect(() => {
    if (isOpen && token) {
      loadNotifications();
    }
  }, [isOpen, token]);

  const loadNotifications = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      const fetchedNotifications = await fetchNotifications(token);
      setNotifications(fetchedNotifications);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (token && notifications.length > 0) {
      // Marcar todas las notificaciones no leídas como leídas al cerrar
      const unreadIds = notifications.filter((n) => !n.leida).map((n) => n.id);
      if (unreadIds.length > 0) {
        try {
          await markNotificationsAsRead(token, unreadIds);
          // Actualizar estado local
          setNotifications((prev) =>
            prev.map((n) => (unreadIds.includes(n.id) ? { ...n, leida: true } : n))
          );
        } catch (err) {
          console.error('Error al marcar notificaciones como leídas:', err);
        }
      }
    }
    onClose();
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'evento':
        return calendarOutline;
      case 'ticket':
        return ticketOutline;
      case 'puntos':
        return starOutline;
      default:
        return ticketOutline;
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'evento':
        return '#22c55e';
      case 'ticket':
        return '#ffeb3b';
      case 'puntos':
        return '#3b82f6';
      default:
        return '#888888';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notificaciones</IonTitle>
          <IonButton slot="end" fill="clear" onClick={handleClose}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="notifications-content">
        {isLoading ? (
          <div className="notifications-loading">
            <IonSpinner />
            <IonText>Cargando notificaciones...</IonText>
          </div>
        ) : error ? (
          <div className="notifications-error">
            <IonText color="danger">{error}</IonText>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <IonText color="medium">No tenés notificaciones</IonText>
          </div>
        ) : (
          <IonList lines="full" className="notifications-list">
            {notifications.map((notification) => (
              <IonItem
                key={notification.id}
                className={`notification-item ${notification.leida ? 'read' : 'unread'}`}
              >
                <div className="notification-icon-wrapper" style={{ color: getNotificationColor(notification.tipo) }}>
                  <IonIcon icon={getNotificationIcon(notification.tipo)} />
                </div>
                <IonLabel>
                  <h2 className="notification-title">{notification.titulo}</h2>
                  <p className="notification-message">{notification.mensaje}</p>
                  <p className="notification-time">{formatDate(notification.fechaCreacion)}</p>
                </IonLabel>
                {!notification.leida && <div className="notification-dot"></div>}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
};

export default NotificationsPanel;

