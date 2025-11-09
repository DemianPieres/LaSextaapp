import {
  IonAlert,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerScanResult,
} from '@capacitor/barcode-scanner';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addOutline,
  calendarOutline,
  logOutOutline,
  mailOutline,
  refreshOutline,
  scanOutline,
  ticketOutline,
} from 'ionicons/icons';
import {
  fetchAdminUsers,
  fetchAdminTicketsByUser,
  generateTicketForUser,
  sendTicketEmail,
  validateTicketByCode,
  markTicketAsUsed,
  type AdminTicket,
  type AdminUserSummary,
} from '../../api/admin';
import {
  createAdminEvent,
  deleteAdminEvent,
  fetchAdminEvents,
  subscribeToEventStream,
  updateAdminEvent,
  type EventDto,
  type EventStreamMessage,
} from '../../api/events';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

type GenerateTicketState = {
  isOpen: boolean;
  diasValidez: number;
};

type EventFormState = {
  titulo: string;
  fecha: string;
  hora: string;
  dia: string;
  ubicacion: string;
  descripcion: string;
  imagenFondo: string;
  linkCompra: string;
};

const DEFAULT_EVENT_FORM_STATE: EventFormState = {
  titulo: '',
  fecha: '',
  hora: '',
  dia: '',
  ubicacion: 'LA SEXTA',
  descripcion: '',
  imagenFondo: '',
  linkCompra: '',
};

const sortEvents = (events: EventDto[]): EventDto[] =>
  [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const getErrorMessage = (error: unknown, fallback: string): string => {
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

const AdminDashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const [presentToast] = useIonToast();

  const admin = session?.type === 'admin' ? session.profile : null;
  const adminToken = session?.type === 'admin' ? session.token : null;

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [generateTicketState, setGenerateTicketState] = useState<GenerateTicketState>({
    isOpen: false,
    diasValidez: 7,
  });

  const [activeSection, setActiveSection] = useState<'tickets' | 'events'>('tickets');
  const [events, setEvents] = useState<EventDto[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventFormState, setEventFormState] = useState<EventFormState>(DEFAULT_EVENT_FORM_STATE);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventDto | null>(null);

  const [validationCode, setValidationCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.estado === 'valido'),
    [tickets]
  );
  const usedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.estado !== 'valido'),
    [tickets]
  );

  const showToast = useCallback(
    (message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'success') => {
      presentToast({
        message,
        duration: 2500,
        color,
      });
    },
    [presentToast]
  );

  const loadUsers = useCallback(async () => {
    if (!adminToken) return;
    setUsersLoading(true);
    try {
      const data = await fetchAdminUsers(adminToken);
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].id);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudieron cargar los usuarios.');
      showToast(message, 'danger');
    } finally {
      setUsersLoading(false);
    }
  }, [adminToken, selectedUserId, showToast]);

  const loadTickets = useCallback(
    async (userId: string | null) => {
      if (!adminToken || !userId) {
        setTickets([]);
        return;
      }
      setTicketsLoading(true);
      try {
        const data = await fetchAdminTicketsByUser(adminToken, userId);
        setTickets(data);
      } catch (error: unknown) {
        const message = getErrorMessage(error, 'No se pudieron cargar los tickets.');
        showToast(message, 'danger');
      } finally {
        setTicketsLoading(false);
      }
    },
    [adminToken, showToast]
  );

  const loadEvents = useCallback(async () => {
    if (!adminToken) return;
    setEventsLoading(true);
    try {
      const data = await fetchAdminEvents(adminToken);
      setEvents(sortEvents(data));
      setEventsError(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudieron cargar los eventos.');
      setEventsError(message);
      showToast(message, 'danger');
    } finally {
      setEventsLoading(false);
    }
  }, [adminToken, showToast]);

  const handleEventStreamMessage = useCallback((message: EventStreamMessage) => {
    switch (message.type) {
      case 'snapshot':
        setEventsError(null);
        setEvents(sortEvents(message.events));
        break;
      case 'created':
        setEventsError(null);
        setEvents((prev) =>
          sortEvents([...prev.filter((event) => event.id !== message.event.id), message.event])
        );
        break;
      case 'updated':
        setEventsError(null);
        setEvents((prev) =>
          sortEvents(prev.map((event) => (event.id === message.event.id ? message.event : event)))
        );
        break;
      case 'deleted':
        setEventsError(null);
        setEvents((prev) => prev.filter((event) => event.id !== message.eventId));
        break;
      case 'ping':
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      void loadUsers();
    }
  }, [adminToken, loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      void loadTickets(selectedUserId);
    }
  }, [selectedUserId, loadTickets]);

  useEffect(() => {
    if (adminToken) {
      void loadEvents();
    } else {
      setEvents([]);
    }
  }, [adminToken, loadEvents]);

  useEffect(() => {
    if (!adminToken) {
      return;
    }
    const eventSource = subscribeToEventStream(handleEventStreamMessage, () => {
      console.warn('[admin] Conexión SSE de eventos interrumpida.');
    });

    return () => {
      eventSource.close();
    };
  }, [adminToken, handleEventStreamMessage]);

  const handleGenerateTicket = async () => {
    if (!adminToken || !selectedUserId) return;
    try {
      await generateTicketForUser(adminToken, {
        userId: selectedUserId,
        diasValidez: generateTicketState.diasValidez,
      });
      showToast('Ticket generado correctamente.');
      setGenerateTicketState((prev) => ({ ...prev, isOpen: false }));
      await loadTickets(selectedUserId);
      await loadUsers();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo generar el ticket. Intenta nuevamente.');
      showToast(message, 'danger');
    }
  };

  const handleSendTicket = async (ticketId: string) => {
    if (!adminToken || !selectedUserId) return;
    try {
      await sendTicketEmail(adminToken, { userId: selectedUserId, ticketId });
      showToast('Ticket enviado al correo del usuario.');
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo enviar el ticket. Verifica la configuración SMTP.');
      showToast(message, 'danger');
    }
  };

  const handleMarkAsUsed = async (ticketId: string) => {
    if (!adminToken || !selectedUserId) return;
    try {
      await markTicketAsUsed(adminToken, ticketId);
      showToast('Ticket marcado como usado.');
      await loadTickets(selectedUserId);
      await loadUsers();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo actualizar el estado del ticket.');
      showToast(message, 'danger');
    }
  };

  const handleOpenCreateEvent = () => {
    setEditingEventId(null);
    setEventFormState(DEFAULT_EVENT_FORM_STATE);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: EventDto) => {
    setEditingEventId(event.id);
    setEventFormState({
      titulo: event.titulo,
      fecha: event.fecha,
      hora: event.hora,
      dia: event.dia,
      ubicacion: event.ubicacion,
      descripcion: event.descripcion ?? '',
      imagenFondo: event.imagenFondo ?? '',
      linkCompra: event.linkCompra ?? '',
    });
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEventId(null);
    setEventFormState(DEFAULT_EVENT_FORM_STATE);
  };

  const handleSubmitEvent = async () => {
    if (!adminToken) return;

    const trimmedTitulo = eventFormState.titulo.trim();
    const trimmedFecha = eventFormState.fecha.trim();
    const trimmedHora = eventFormState.hora.trim();
    const trimmedDia = eventFormState.dia.trim();
    const trimmedUbicacion = eventFormState.ubicacion.trim();
    const trimmedDescripcion = eventFormState.descripcion.trim();
    const trimmedImagen = eventFormState.imagenFondo.trim();
    const trimmedLink = eventFormState.linkCompra.trim();

    if (!trimmedTitulo || !trimmedFecha || !trimmedHora || !trimmedDia) {
      showToast('Completá al menos título, fecha, hora y día para guardar el evento.', 'warning');
      return;
    }

    const payload = {
      titulo: trimmedTitulo,
      fecha: trimmedFecha,
      hora: trimmedHora,
      dia: trimmedDia,
      ...(trimmedUbicacion ? { ubicacion: trimmedUbicacion } : {}),
      ...(trimmedDescripcion ? { descripcion: trimmedDescripcion } : {}),
      ...(trimmedImagen ? { imagenFondo: trimmedImagen } : {}),
      ...(trimmedLink ? { linkCompra: trimmedLink } : {}),
    };

    setIsSavingEvent(true);
    try {
      if (editingEventId) {
        await updateAdminEvent(adminToken, editingEventId, payload);
        showToast('Evento actualizado correctamente.');
      } else {
        await createAdminEvent(adminToken, payload);
        showToast('Evento creado correctamente.');
      }
      handleCloseEventModal();
      await loadEvents();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo guardar el evento. Intenta nuevamente.');
      showToast(message, 'danger');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!adminToken) return;
    setDeletingEventId(eventId);
    try {
      await deleteAdminEvent(adminToken, eventId);
      showToast('Evento eliminado correctamente.');
      await loadEvents();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo eliminar el evento.');
      showToast(message, 'danger');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleValidateCode = async (code: string) => {
    if (!adminToken) return;
    setIsValidating(true);
    try {
      const ticket = await validateTicketByCode(adminToken, code.trim());
      showToast(`Ticket ${ticket.codigoQR} validado correctamente.`, 'success');
      if (selectedUserId) {
        await loadTickets(selectedUserId);
      }
      await loadUsers();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo validar el código. Verificá que esté vigente.');
      showToast(message, 'danger');
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualValidation = async () => {
    if (validationCode.trim() === '') {
      showToast('Ingresá un código QR válido.', 'warning');
      return;
    }
    await handleValidateCode(validationCode);
    setValidationCode('');
  };

  const handleScan = async () => {
    if (!adminToken) return;
    try {
      setIsScanning(true);
      const result = (await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.ALL,
        scanInstructions: 'Apuntá la cámara al código QR',
        scanText: 'Escanear',
      })) as CapacitorBarcodeScannerScanResult;

      setIsScanning(false);

      const code = result?.ScanResult ?? null;

      if (code) {
        await handleValidateCode(code);
      } else {
        showToast('No se detectó ningún código QR.', 'warning');
      }
    } catch (error) {
      console.error('[admin] Error al escanear QR:', error);
      showToast('No se pudo utilizar la cámara. Ingresá el código manualmente.', 'danger');
      setIsScanning(false);
    }
  };

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Panel Administrador</IonTitle>
          <IonButton fill="clear" slot="end" onClick={logout}>
            <IonIcon icon={logOutOutline} slot="start" />
            Cerrar sesión
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="tickets-wrapper">
          <header className="tickets-header">
            <div className="tickets-icon">
              <IonIcon icon={activeSection === 'tickets' ? ticketOutline : calendarOutline} />
            </div>
            <div className="tickets-heading">
              <h1>{activeSection === 'tickets' ? 'Gestión de Tickets' : 'Gestión de Eventos'}</h1>
              <p>
                {activeSection === 'tickets'
                  ? 'Emití, enviá y validá códigos QR en tiempo real. Todos los cambios se reflejan automáticamente en los usuarios.'
                  : 'Creá, editá y eliminá eventos. Los usuarios verán las actualizaciones al instante sin recargar la app.'}
              </p>
            </div>
          </header>

          <IonSegment
            value={activeSection}
            onIonChange={(event) => {
              const value = (event.detail.value as 'tickets' | 'events') ?? 'tickets';
              setActiveSection(value);
            }}
            className="admin-section-segment"
          >
            <IonSegmentButton value="tickets">
              <IonLabel>Tickets</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="events">
              <IonLabel>Eventos</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {activeSection === 'tickets' ? (
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Sesión activa</IonCardTitle>
                      <IonCardSubtitle>Datos del administrador logueado</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {admin ? (
                        <IonList lines="none">
                          <IonItem>
                            <IonLabel>
                              <h2>Nombre</h2>
                              <p>{admin.nombre}</p>
                            </IonLabel>
                          </IonItem>
                          <IonItem>
                            <IonLabel>
                              <h2>Email</h2>
                              <p>{admin.email}</p>
                            </IonLabel>
                          </IonItem>
                        </IonList>
                      ) : (
                        <IonText>No se pudo cargar la información del administrador.</IonText>
                      )}
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Usuarios</IonCardTitle>
                      <IonCardSubtitle>Seleccioná un usuario para gestionar sus tickets</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <IonButton
                          size="small"
                          color="medium"
                          onClick={() => {
                            void loadUsers();
                            if (selectedUserId) {
                              void loadTickets(selectedUserId);
                            }
                          }}
                        >
                          <IonIcon icon={refreshOutline} slot="start" />
                          Actualizar
                        </IonButton>
                      </div>
                      {usersLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                          <IonSpinner />
                        </div>
                      ) : users.length === 0 ? (
                        <IonText color="medium">No hay usuarios registrados.</IonText>
                      ) : (
                        <IonList>
                          {users.map((user) => (
                            <IonItem
                              key={user.id}
                              button
                              detail
                              color={selectedUserId === user.id ? 'primary' : undefined}
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <IonLabel>
                                <h2>{user.nombre}</h2>
                                <p>{user.email}</p>
                              </IonLabel>
                              <IonBadge color="success">{user.ticketsActivos} activos</IonBadge>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Validación rápida</IonCardTitle>
                      <IonCardSubtitle>Escaneá o ingresá manualmente un código QR</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent className="admin-validation-card">
                      <IonTextarea
                        value={validationCode}
                        placeholder="Ej: QR-ABCD-1234"
                        autoGrow
                        onIonInput={(event) => setValidationCode(event.detail.value ?? '')}
                      />
                      <div className="admin-validation-actions">
                        <IonButton onClick={handleManualValidation} disabled={isValidating}>
                          <IonIcon icon={mailOutline} slot="start" />
                          Validar código
                        </IonButton>
                        <IonButton
                          color="tertiary"
                          onClick={handleScan}
                          disabled={isScanning && Capacitor.isNativePlatform()}
                        >
                          <IonIcon icon={scanOutline} slot="start" />
                          {isScanning ? 'Escaneando...' : 'Escanear'}
                        </IonButton>
                      </div>
                      <IonText color="medium">
                        <small>
                          En navegadores de escritorio puede que el escaneo no esté disponible. En ese caso, ingresá el código manualmente.
                        </small>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeLg="8">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Tickets del usuario</IonCardTitle>
                      <IonCardSubtitle>
                        {selectedUser
                          ? `${selectedUser.nombre} — ${selectedUser.email}`
                          : 'Seleccioná un usuario de la lista'}
                      </IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <IonButton
                          onClick={() =>
                            setGenerateTicketState({
                              isOpen: true,
                              diasValidez: 7,
                            })
                          }
                          disabled={!selectedUserId}
                        >
                          <IonIcon icon={addOutline} slot="start" />
                          Generar ticket
                        </IonButton>
                        <IonButton
                          color="medium"
                          onClick={() => {
                            if (selectedUserId) {
                              void loadTickets(selectedUserId);
                            }
                          }}
                          disabled={!selectedUserId}
                        >
                          <IonIcon icon={refreshOutline} slot="start" />
                          Refrescar
                        </IonButton>
                      </div>

                      {ticketsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                          <IonSpinner />
                        </div>
                      ) : selectedUserId === null ? (
                        <IonText color="medium">Elegí un usuario para ver sus tickets.</IonText>
                      ) : tickets.length === 0 ? (
                        <IonText color="medium">
                          Este usuario todavía no tiene tickets emitidos. Generá uno para comenzar.
                        </IonText>
                      ) : (
                        <>
                          {activeTickets.length > 0 && (
                            <section className="admin-ticket-section">
                              <h2>Activos</h2>
                              <IonList>
                                {activeTickets.map((ticket) => (
                                  <IonItem key={ticket.id} className="admin-ticket-card">
                                    <IonLabel>
                                      <h3>{ticket.codigoQR}</h3>
                                      <p>
                                        Emitido: {new Date(ticket.fechaCreacion).toLocaleString('es-AR')} — Vence:{' '}
                                        {ticket.fechaVencimiento
                                          ? new Date(ticket.fechaVencimiento).toLocaleDateString('es-AR')
                                          : 'Sin vencimiento'}
                                      </p>
                                    </IonLabel>
                                    <div className="admin-ticket-actions">
                                      <IonButton
                                        size="small"
                                        color="tertiary"
                                        onClick={() => handleSendTicket(ticket.id)}
                                      >
                                        <IonIcon icon={mailOutline} slot="start" />
                                        Enviar
                                      </IonButton>
                                      <IonButton
                                        size="small"
                                        color="danger"
                                        onClick={() => handleMarkAsUsed(ticket.id)}
                                      >
                                        Marcar usado
                                      </IonButton>
                                    </div>
                                  </IonItem>
                                ))}
                              </IonList>
                            </section>
                          )}

                          {usedTickets.length > 0 && (
                            <section className="admin-ticket-section">
                              <h2>Historial</h2>
                              <IonList>
                                {usedTickets.map((ticket) => (
                                  <IonItem key={ticket.id} className="admin-ticket-card">
                                    <IonLabel>
                                      <h3>{ticket.codigoQR}</h3>
                                      <p>
                                        Estado: {ticket.estado.toUpperCase()} — Usado:{' '}
                                        {ticket.fechaUso
                                          ? new Date(ticket.fechaUso).toLocaleString('es-AR')
                                          : '—'}
                                      </p>
                                    </IonLabel>
                                  </IonItem>
                                ))}
                              </IonList>
                            </section>
                          )}
                        </>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          ) : (
            <section className="admin-events-container">
              <div className="admin-events-toolbar">
                <div>
                  <h2>Eventos publicados</h2>
                  <p>
                    Publicá y administrá los eventos que ven los clientes. Las actualizaciones se reflejan de inmediato en la app.
                  </p>
                </div>
                <div className="admin-events-actions">
                  <IonButton onClick={handleOpenCreateEvent}>
                    <IonIcon icon={addOutline} slot="start" />
                    Nuevo evento
                  </IonButton>
                  <IonButton color="medium" onClick={() => void loadEvents()} disabled={eventsLoading}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    Actualizar
                  </IonButton>
                </div>
              </div>

              {eventsLoading ? (
                <div className="admin-events-feedback">
                  <IonSpinner />
                  <IonText>Cargando eventos...</IonText>
                </div>
              ) : eventsError ? (
                <div className="admin-events-feedback">
                  <IonText color="danger">{eventsError}</IonText>
                </div>
              ) : events.length === 0 ? (
                <div className="admin-events-feedback">
                  <IonText color="medium">
                    No hay eventos publicados todavía. Creá el primero para que los clientes lo vean en la app.
                  </IonText>
                </div>
              ) : (
                <div className="admin-events-list">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      mode="admin"
                      deleteDisabled={deletingEventId === event.id}
                      onEdit={handleEditEvent}
                      onDelete={(selectedEvent) => setEventToDelete(selectedEvent)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <IonModal
          isOpen={generateTicketState.isOpen}
          onDidDismiss={() =>
            setGenerateTicketState({
              isOpen: false,
              diasValidez: 7,
            })
          }
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Generar ticket</IonTitle>
              <IonButton
                slot="end"
                fill="clear"
                onClick={() =>
                  setGenerateTicketState({
                    isOpen: false,
                    diasValidez: 7,
                  })
                }
              >
                Cerrar
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Días de validez</IonLabel>
              <IonInput
                type="number"
                value={generateTicketState.diasValidez}
                min={1}
                max={90}
                onIonInput={(event) =>
                  setGenerateTicketState((prev) => ({
                    ...prev,
                    diasValidez: Number(event.detail.value ?? 7),
                  }))
                }
              />
            </IonItem>
            <IonButton expand="block" style={{ marginTop: '24px' }} onClick={handleGenerateTicket}>
              Generar
            </IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={isEventModalOpen} onDidDismiss={handleCloseEventModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingEventId ? 'Editar evento' : 'Nuevo evento'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseEventModal}>
                Cerrar
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="full">
              <IonItem>
                <IonLabel position="stacked">Título</IonLabel>
                <IonInput
                  value={eventFormState.titulo}
                  placeholder="Ej: Fiesta Retro"
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      titulo: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Fecha</IonLabel>
                <IonInput
                  value={eventFormState.fecha}
                  placeholder="Ej: 25 dic."
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      fecha: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Hora</IonLabel>
                <IonInput
                  value={eventFormState.hora}
                  placeholder="Ej: 23:59hs"
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      hora: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Día</IonLabel>
                <IonInput
                  value={eventFormState.dia}
                  placeholder="Ej: miércoles"
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      dia: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Ubicación</IonLabel>
                <IonInput
                  value={eventFormState.ubicacion}
                  placeholder="LA SEXTA"
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      ubicacion: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción (opcional)</IonLabel>
                <IonTextarea
                  value={eventFormState.descripcion}
                  autoGrow
                  placeholder="Breve mensaje que se mostrará dentro de la tarjeta."
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      descripcion: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Imagen de fondo (opcional)</IonLabel>
                <IonInput
                  value={eventFormState.imagenFondo}
                  placeholder="URL pública o ruta (ej: /card1.jpeg)"
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      imagenFondo: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Link para comprar tickets (opcional)</IonLabel>
                <IonInput
                  value={eventFormState.linkCompra}
                  placeholder="https://..."
                  onIonChange={(event) =>
                    setEventFormState((prev) => ({
                      ...prev,
                      linkCompra: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
            </IonList>
            <IonButton
              expand="block"
              style={{ marginTop: '24px' }}
              onClick={handleSubmitEvent}
              disabled={isSavingEvent}
            >
              {isSavingEvent
                ? 'Guardando...'
                : editingEventId
                ? 'Actualizar evento'
                : 'Crear evento'}
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={eventToDelete !== null}
          header="Eliminar evento"
          message={`¿Seguro que querés eliminar "${eventToDelete?.titulo}"? Esta acción no se puede deshacer.`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                const eventId = eventToDelete?.id;
                if (eventId) {
                  void handleDeleteEvent(eventId);
                }
              },
            },
          ]}
          onDidDismiss={() => setEventToDelete(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;

