import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonToolbar,
} from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import { calendar, download, notifications } from 'ionicons/icons';
import EventCard from '../components/EventCard';
import EventCalendar from '../components/EventCalendar';
import NotificationsPanel from '../components/NotificationsPanel';
import {
  fetchEvents,
  subscribeToEventStream,
  type EventDto,
  type EventStreamMessage,
} from '../api/events';
import { useAuth } from '../context/AuthContext';
import { getUnreadNotificationsCount, subscribeToNotifications } from '../api/notifications';
import { scheduleLocalNotification } from '../utils/notifications';
import './Home.css';

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const potentialMessage = (error as { message?: unknown }).message;
    if (typeof potentialMessage === 'string' && potentialMessage.trim() !== '') {
      return potentialMessage;
    }
  }
  return fallback;
};

const sortEvents = (events: EventDto[]): EventDto[] => {
  return [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

const Home: React.FC = () => {
  const { session } = useAuth();
  const [events, setEvents] = useState<EventDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const applyStreamMessage = useCallback((message: EventStreamMessage) => {
    switch (message.type) {
      case 'snapshot':
        setEvents(sortEvents(message.events));
        break;
      case 'created':
        setEvents((prev) => sortEvents([...prev.filter((event) => event.id !== message.event.id), message.event]));
        // Mostrar notificación push cuando se crea un nuevo evento
        if (message.event) {
          scheduleLocalNotification({
            title: '¡Nuevo Evento Disponible!',
            body: `Se ha publicado un nuevo evento: ${message.event.titulo}`,
            id: Date.now(),
          });
        }
        break;
      case 'updated':
        setEvents((prev) =>
          sortEvents(
            prev.map((event) => (event.id === message.event.id ? message.event : event))
          )
        );
        break;
      case 'deleted':
        setEvents((prev) => prev.filter((event) => event.id !== message.eventId));
        break;
      case 'ping':
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadEvents = async () => {
      try {
        const fetchedEvents = await fetchEvents();
        if (isActive) {
          setEvents(sortEvents(fetchedEvents));
          setErrorMessage(null);
        }
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }
        const message = resolveErrorMessage(error, 'No pudimos cargar los eventos. Intenta nuevamente.');
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadEvents();

    const eventSource = subscribeToEventStream(applyStreamMessage, () => {
      console.warn('[eventos] Conexión SSE interrumpida. Intentá refrescar si la lista no se actualiza.');
    });

    return () => {
      isActive = false;
      eventSource.close();
    };
  }, [applyStreamMessage]);

  // Cargar y actualizar contador de notificaciones
  useEffect(() => {
    if (!session || session.type !== 'user') return;

    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationsCount(session.token);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error al cargar contador de notificaciones:', error);
      }
    };

    void loadUnreadCount();

    // Suscribirse a actualizaciones de notificaciones
    const unsubscribe = subscribeToNotifications(session.token, (notification) => {
      setUnreadCount((prev) => prev + 1);
      // Mostrar notificación push
      scheduleLocalNotification({
        title: notification.titulo,
        body: notification.mensaje,
        id: Date.now(),
      });
    });

    return () => {
      unsubscribe();
    };
  }, [session]);

  // Recargar contador cuando se cierra el panel de notificaciones
  useEffect(() => {
    if (!isNotificationsOpen && session && session.type === 'user') {
      const loadUnreadCount = async () => {
        try {
          const count = await getUnreadNotificationsCount(session.token);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error al cargar contador de notificaciones:', error);
        }
      };
      void loadUnreadCount();
    }
  }, [isNotificationsOpen, session]);

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <div className="header-content">
            <div className="logo-container">
              <img src="./logonuevolasexta.png" alt="La Sexta Logo" className="logo-image" />
            </div>
            <div className="header-icons">
              <IonIcon 
                icon={calendar} 
                className="header-icon calendar-icon" 
                onClick={() => setIsCalendarOpen(true)}
                style={{ cursor: 'pointer' }}
              />
              <div className="notification-container" onClick={() => setIsNotificationsOpen(true)} style={{ cursor: 'pointer' }}>
                <IonIcon icon={notifications} className="header-icon" />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="events-content">
        <div className="events-container">
          {isLoading ? (
            <div className="events-feedback">
              <IonSpinner name="crescent" />
              <IonText>Cargando eventos...</IonText>
            </div>
          ) : errorMessage ? (
            <div className="events-feedback">
              <IonText color="danger">{errorMessage}</IonText>
            </div>
          ) : events.length === 0 ? (
            <div className="events-feedback">
              <IonText color="medium">Todavía no hay eventos publicados. Vuelve a intentarlo más tarde.</IonText>
            </div>
          ) : (
            events.map((event) => <EventCard key={event.id} event={event} mode="user" />)
          )}
        </div>
        <EventCalendar 
          isOpen={isCalendarOpen} 
          onClose={() => setIsCalendarOpen(false)}
          events={events}
        />
        <NotificationsPanel
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
