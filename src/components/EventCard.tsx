import { IonButton } from '@ionic/react';
import type { EventDto } from '../api/events';
import './EventCard.css';

type EventCardMode = 'user' | 'admin';

type EventCardProps = {
  event: EventDto;
  mode?: EventCardMode;
  onEdit?: (event: EventDto) => void;
  onDelete?: (event: EventDto) => void;
  onBuy?: (event: EventDto) => void;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
};

const FALLBACK_IMAGE = '/card1.jpeg';

const EventCard: React.FC<EventCardProps> = ({
  event,
  mode = 'user',
  onEdit,
  onDelete,
  onBuy,
  editDisabled = false,
  deleteDisabled = false,
}) => {
  const backgroundImage = event.imagenFondo && event.imagenFondo.trim() !== '' ? event.imagenFondo : FALLBACK_IMAGE;

  const headerStyle = {
    backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.25) 50%, rgba(0, 0, 0, 0.4) 100%), url('${backgroundImage}')`,
  };

  const isUserMode = mode === 'user';
  const showBuyButton = isUserMode;
  const showAdminActions = mode === 'admin';

  const handleReserveClick = () => {
    // Redirigir a WhatsApp con mensaje predeterminado
    const phoneNumber = '3825414123';
    const message = encodeURIComponent('Hola sexta club! me gustaria realizar una reserva para un evento.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="event-card">
      <div className="event-card-header" style={headerStyle}>
        <div className="event-chip-row event-chip-row-top">
          <div className="event-chip event-chip-light">{event.fecha}</div>
          <div className="event-chip event-chip-dark">{event.hora}</div>
        </div>
        <div className="event-chip-row event-chip-row-bottom">
          <div className="event-chip event-chip-light">{event.dia}</div>
          <div className="event-chip event-chip-dark">
            <span className="location-icon" role="img" aria-label="Ubicación">
              📍
            </span>
            {event.ubicacion}
          </div>
        </div>
      </div>
      <div className="event-card-footer">
        <div className="event-title-footer">{event.titulo}</div>
        {event.descripcion !== null && event.descripcion.trim() !== '' ? (
          <p className="event-description-text">{event.descripcion}</p>
        ) : null}
        {showBuyButton ? (
          <IonButton
            className="buy-ticket-btn"
            expand="block"
            onClick={handleReserveClick}
          >
            Reservar Aquí
          </IonButton>
        ) : null}
        {showAdminActions ? (
          <div className="event-admin-actions">
            <IonButton fill="outline" size="small" disabled={editDisabled} onClick={() => onEdit?.(event)}>
              {editDisabled ? 'Editando...' : 'Editar'}
            </IonButton>
            <IonButton
              fill="outline"
              size="small"
              color="danger"
              disabled={deleteDisabled}
              onClick={() => onDelete?.(event)}
            >
              {deleteDisabled ? 'Eliminando...' : 'Eliminar'}
            </IonButton>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EventCard;


