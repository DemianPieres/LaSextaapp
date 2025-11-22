import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { closeOutline, qrCodeOutline, ticketOutline, timeOutline } from 'ionicons/icons';
import QRCode from 'react-qr-code';
import type { RefresherEventDetail } from '@ionic/core';
import { fetchActiveTickets, fetchTicketsHistory, type TicketDto } from '../api/tickets';
import { useAuth } from '../context/AuthContext';
import './MisTickets.css';

type Ticket = {
  id: string;
  code: string;
  issuedAt: string;
  expiresAt: string;
  status: TicketDto['estado'];
};

const MisTickets: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [historyTickets, setHistoryTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { session } = useAuth();

  const isUserSession = session?.type === 'user';
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    []
  );

  const mapTicket = useCallback(
    (dto: TicketDto): Ticket => ({
      id: dto.id,
      code: dto.codigoQR,
      status: dto.estado,
      issuedAt: dateFormatter.format(new Date(dto.fechaCreacion)),
      expiresAt: dto.fechaVencimiento ? dateFormatter.format(new Date(dto.fechaVencimiento)) : 'Sin vencimiento',
    }),
    [dateFormatter]
  );

  const loadTickets = useCallback(async () => {
    if (!isUserSession) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const userId = session.profile.id;
      const token = session.token;
      const [active, history] = await Promise.all([
        fetchActiveTickets(userId, token),
        fetchTicketsHistory(userId, token),
      ]);
      
      // Combinar todos los tickets DTOs y ordenar por fecha de creación (más recientes primero)
      const allTickets = [...active, ...history];
      allTickets.sort((a, b) => {
        const dateA = new Date(a.fechaCreacion).getTime();
        const dateB = new Date(b.fechaCreacion).getTime();
        return dateB - dateA;
      });
      
      // Mantener solo los 2 más recientes
      const recentTickets = allTickets.slice(0, 2);
      
      // Separar en activos e historial basándose en el estado del DTO
      const recentActive = recentTickets.filter((t) => t.estado === 'valido').map(mapTicket);
      const recentHistory = recentTickets.filter((t) => t.estado !== 'valido').map(mapTicket);
      
      setActiveTickets(recentActive);
      setHistoryTickets(recentHistory);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'No se pudieron cargar los tickets. Intentá nuevamente.';
      setErrorMessage(message);
      setActiveTickets([]);
      setHistoryTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [isUserSession, mapTicket, session?.profile.id, session?.token]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleRefresh = useCallback(
    async (event: CustomEvent<RefresherEventDetail>) => {
      await loadTickets();
      event.detail.complete();
    },
    [loadTickets]
  );

  const handleOpenModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  if (!isUserSession) {
    return (
      <IonPage className="page-with-shared-background">
        <IonHeader className="custom-header">
          <IonToolbar className="header-toolbar">
            <IonTitle>Mis Tickets</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="page-content">
          <div className="tickets-wrapper">
            <section className="empty-state">
              <div className="empty-state__icon">
                <IonIcon icon={ticketOutline} />
              </div>
              <h2>Necesitas una cuenta de cliente</h2>
              <p>Iniciá sesión con un usuario cliente para visualizar los tickets asociados.</p>
            </section>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const currentActiveTicket = activeTickets.length > 0 ? activeTickets[0] : null;

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Mis Tickets</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="tickets-wrapper">
          <header className="tickets-header">
            <div className="tickets-icon">
              <IonIcon icon={ticketOutline} />
            </div>
            <div className="tickets-heading">
              <h1>Mis Tickets</h1>
              <p>Aquí podés ver y usar tus tickets disponibles.</p>
            </div>
          </header>

          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent
              pullingText="Deslizá hacia abajo para actualizar"
              refreshingSpinner="crescent"
            />
          </IonRefresher>

          {errorMessage && !isLoading && (
            <section className="empty-state">
              <div className="empty-state__icon">
                <IonIcon icon={ticketOutline} />
              </div>
              <h2>Ups, algo salió mal</h2>
              <p>{errorMessage}</p>
            </section>
          )}

          {isLoading && (
            <section className="empty-state">
              <div className="empty-state__icon">
                <IonSpinner />
              </div>
              <h2>Cargando tickets...</h2>
              <p>Estamos recuperando tu información. Aguarda un instante.</p>
            </section>
          )}

          {!isLoading && !errorMessage && currentActiveTicket ? (
            <section className="ticket-section">
              <h2 className="section-title">Ticket disponible</h2>
              <IonCard
                className={`ticket-card ${
                  currentActiveTicket.status === 'valido' ? 'ticket-card--active' : 'ticket-card--used'
                }`}
                onClick={() => handleOpenModal(currentActiveTicket)}
                button
              >
                <IonCardHeader>
                  <IonCardTitle>Bebida gratuita</IonCardTitle>
                  <IonCardSubtitle>{currentActiveTicket.code}</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="ticket-status">
                    <IonBadge color={currentActiveTicket.status === 'valido' ? 'success' : 'medium'}>
                      {currentActiveTicket.status === 'valido' ? 'Válido' : 'Usado / Expirado'}
                    </IonBadge>
                    <IonText className="ticket-id">{currentActiveTicket.id}</IonText>
                  </div>
                  <p className="ticket-description">Ticket válido por una bebida gratuita.</p>
                  <div className="ticket-dates">
                    <span>
                      <IonIcon icon={timeOutline} />
                      <strong>Emitido:</strong> {currentActiveTicket.issuedAt}
                    </span>
                    <span>
                      <IonIcon icon={timeOutline} />
                      <strong>Vence:</strong> {currentActiveTicket.expiresAt}
                    </span>
                  </div>
                  <div
                    className={`qr-placeholder ${
                      currentActiveTicket.status !== 'valido' ? 'qr-placeholder--disabled' : ''
                    }`}
                  >
                    {currentActiveTicket.status === 'valido' ? (
                      <QRCode value={currentActiveTicket.code} size={128} />
                    ) : (
                      <IonIcon icon={qrCodeOutline} />
                    )}
                  </div>
                  <IonButton
                    expand="block"
                    color="light"
                    fill="clear"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenModal(currentActiveTicket);
                    }}
                  >
                    Ampliar QR
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </section>
          ) : (
            !isLoading &&
            !errorMessage && (
              <section className="empty-state">
                <div className="empty-state__icon">
                  <IonIcon icon={ticketOutline} />
                </div>
                <h2>Sin tickets disponibles</h2>
                <p>
                  Aún no tenés tickets disponibles. Comunicate con el personal para obtener uno.
                </p>
              </section>
            )
          )}

          {!isLoading && !errorMessage && activeTickets.length > 1 && (
            <section className="ticket-section">
              <h2 className="section-title">Otro ticket disponible</h2>
              {activeTickets.slice(1).map((ticket) => (
                <IonCard
                  key={ticket.id}
                  className={`ticket-card ${
                    ticket.status === 'valido' ? 'ticket-card--active' : 'ticket-card--used'
                  }`}
                  onClick={() => handleOpenModal(ticket)}
                  button
                >
                  <IonCardHeader>
                    <IonCardTitle>Bebida gratuita</IonCardTitle>
                    <IonCardSubtitle>{ticket.code}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="ticket-status">
                      <IonBadge color={ticket.status === 'valido' ? 'success' : 'medium'}>
                        {ticket.status === 'valido' ? 'Válido' : 'Usado / Expirado'}
                      </IonBadge>
                      <IonText className="ticket-id">{ticket.id}</IonText>
                    </div>
                    <p className="ticket-description">Ticket válido por una bebida gratuita.</p>
                    <div className="ticket-dates">
                      <span>
                        <IonIcon icon={timeOutline} />
                        <strong>Emitido:</strong> {ticket.issuedAt}
                      </span>
                      <span>
                        <IonIcon icon={timeOutline} />
                        <strong>Vence:</strong> {ticket.expiresAt}
                      </span>
                    </div>
                    <div
                      className={`qr-placeholder ${
                        ticket.status !== 'valido' ? 'qr-placeholder--disabled' : ''
                      }`}
                    >
                      {ticket.status === 'valido' ? (
                        <QRCode value={ticket.code} size={128} />
                      ) : (
                        <IonIcon icon={qrCodeOutline} />
                      )}
                    </div>
                    <IonButton
                      expand="block"
                      color="light"
                      fill="clear"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenModal(ticket);
                      }}
                    >
                      Ampliar QR
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ))}
            </section>
          )}

          {!isLoading && !errorMessage && historyTickets.length > 0 && (
            <section className="history-section">
              <h2 className="section-title">Historial de tickets</h2>
              {historyTickets.map((ticket) => (
                <IonCard
                  key={ticket.id}
                  className={`ticket-card ticket-card--compact ${
                    ticket.status === 'valido' ? 'ticket-card--active' : 'ticket-card--used'
                  }`}
                >
                  <IonCardHeader>
                    <IonCardTitle>Bebida gratuita</IonCardTitle>
                    <IonCardSubtitle>{ticket.code}</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="ticket-status">
                      <IonBadge color={ticket.status === 'valido' ? 'success' : 'danger'}>
                        {ticket.status === 'valido' ? 'Válido' : 'Usado / Expirado'}
                      </IonBadge>
                      <IonText className="ticket-id">{ticket.id}</IonText>
                    </div>
                    <p className="ticket-description ticket-description--muted">
                      Este ticket ya fue utilizado.
                    </p>
                    <div className="ticket-dates">
                      <span>
                        <IonIcon icon={timeOutline} />
                        <strong>Emitido:</strong> {ticket.issuedAt}
                      </span>
                      <span>
                        <IonIcon icon={timeOutline} />
                        <strong>Venció:</strong> {ticket.expiresAt}
                      </span>
                    </div>
                    <div className="qr-placeholder qr-placeholder--disabled">
                      <IonIcon icon={qrCodeOutline} />
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </section>
          )}
        </div>

        <IonModal isOpen={isModalOpen} onDidDismiss={handleCloseModal} className="ticket-modal">
          <IonHeader className="modal-header">
            <IonToolbar>
              <IonTitle>QR del ticket</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseModal}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="modal-content" fullscreen>
            {selectedTicket && (
              <div className="modal-body">
                <div
                  className={`qr-placeholder qr-placeholder--modal ${
                    selectedTicket.status !== 'valido' ? 'qr-placeholder--disabled' : ''
                  }`}
                >
                  {selectedTicket.status === 'valido' ? (
                    <QRCode value={selectedTicket.code} size={220} />
                  ) : (
                    <IonIcon icon={qrCodeOutline} />
                  )}
                </div>
                <div className="modal-details">
                  <IonBadge color={selectedTicket.status === 'valido' ? 'success' : 'danger'}>
                    {selectedTicket.status === 'valido' ? 'Válido' : 'Usado / Expirado'}
                  </IonBadge>
                  <IonText className="ticket-id">{selectedTicket.id}</IonText>
                  <p className="ticket-description">
                    Ticket válido por una bebida gratuita.
                  </p>
                  <div className="ticket-dates">
                    <span>
                      <IonIcon icon={timeOutline} />
                      <strong>Emitido:</strong> {selectedTicket.issuedAt}
                    </span>
                    <span>
                      <IonIcon icon={timeOutline} />
                      <strong>Vence:</strong> {selectedTicket.expiresAt}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default MisTickets;