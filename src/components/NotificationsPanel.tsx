import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/react';
import { notificationsOutline, closeOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserNotifications,
  markNotificationsAsRead,
  cleanupOldNotifications,
  type NotificationDto,
} from '../api/notifications';
import './NotificationsPanel.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const NotificationsPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const token = session?.type === 'user' ? session.token : null;
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autoCleanupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserNotifications(token);
        setNotifications(data);
      } catch (error) {
        // Error al cargar notificaciones - no crítico
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isOpen, token]);

  // Programar limpieza automática 1 minuto después de ver las notificaciones
  useEffect(() => {
    if (!isOpen || !token || notifications.length === 0) {
      if (autoCleanupTimeoutRef.current !== null) {
        window.clearTimeout(autoCleanupTimeoutRef.current);
        autoCleanupTimeoutRef.current = null;
      }
      return;
    }

    if (autoCleanupTimeoutRef.current !== null) {
      window.clearTimeout(autoCleanupTimeoutRef.current);
    }

    autoCleanupTimeoutRef.current = window.setTimeout(async () => {
      try {
        await cleanupOldNotifications(token);
        setNotifications([]);
      } catch (error) {
        // Error al limpiar notificaciones - no crítico
      }
    }, 60_000);

    return () => {
      if (autoCleanupTimeoutRef.current !== null) {
        window.clearTimeout(autoCleanupTimeoutRef.current);
        autoCleanupTimeoutRef.current = null;
      }
    };
  }, [isOpen, token, notifications.length]);

  const handleClose = async () => {
    try {
      if (token && notifications.length > 0) {
        await markNotificationsAsRead(token);
      }
    } catch (error) {
      // Error al marcar notificaciones - no crítico
    } finally {
      onClose();
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} className="notifications-modal">
      <IonHeader>
        <IonToolbar className="notifications-toolbar">
          <div className="notifications-header">
            <div className="notifications-title-container">
              <IonIcon icon={notificationsOutline} className="notifications-icon" />
              <IonTitle className="notifications-title">Notificaciones</IonTitle>
            </div>
            <button className="notifications-close-btn" type="button" onClick={handleClose}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="notifications-content">
        {isLoading ? (
          <div className="notifications-loading">
            <IonSpinner name="crescent" />
            <span>Cargando notificaciones...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <p>No tenés notificaciones por ahora.</p>
          </div>
        ) : (
          <IonList className="notifications-list">
            {notifications.map((n) => (
              <IonItem key={n.id} className={n.leida ? 'notification-item read' : 'notification-item'}>
                <IonLabel>
                  <h2>{n.titulo}</h2>
                  <p>{n.mensaje}</p>
                  <small>
                    {new Date(n.fechaCreacion).toLocaleString('es-AR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </small>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
        <div className="notifications-footer">
          <IonButton expand="block" onClick={handleClose}>
            Cerrar
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default NotificationsPanel;


