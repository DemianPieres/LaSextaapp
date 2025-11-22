import React, { useMemo } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButton, IonContent, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import type { EventDto } from '../api/events';
import './EventCalendar.css';

type EventCalendarProps = {
  isOpen: boolean;
  onClose: () => void;
  events: EventDto[];
};

const EventCalendar: React.FC<EventCalendarProps> = ({ isOpen, onClose, events }) => {
  // Extraer días con eventos del formato DD/MM/YYYY
  const eventDays = useMemo(() => {
    const days = new Set<string>();
    events.forEach((event) => {
      if (event.fecha) {
        // Parsear fecha en formato DD/MM/YYYY
        const fechaRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = event.fecha.match(fechaRegex);
        if (match) {
          const [, dia, mes, año] = match;
          const fechaObj = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
          if (!isNaN(fechaObj.getTime())) {
            // Formato: YYYY-MM-DD para comparación
            const formattedDate = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            days.add(formattedDate);
          }
        }
      }
    });
    return days;
  }, [events]);

  // Obtener eventos por día
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDto[]>();
    events.forEach((event) => {
      if (event.fecha) {
        const fechaRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = event.fecha.match(fechaRegex);
        if (match) {
          const [, dia, mes, año] = match;
          const fechaObj = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
          if (!isNaN(fechaObj.getTime())) {
            const formattedDate = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            if (!map.has(formattedDate)) {
              map.set(formattedDate, []);
            }
            map.get(formattedDate)!.push(event);
          }
        }
      }
    });
    return map;
  }, [events]);

  // Generar calendario del mes actual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isEventDay = (day: number): boolean => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventDays.has(dateStr);
  };

  const getEventsForDay = (day: number): EventDto[] => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventsByDay.get(dateStr) || [];
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Calendario de Eventos</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="calendar-content">
        <div className="calendar-container">
          <div className="calendar-header">
            <h2>{monthNames[currentMonth]} {currentYear}</h2>
          </div>
          
          <div className="calendar-grid">
            {/* Días de la semana */}
            {weekDays.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
            
            {/* Espacios vacíos al inicio */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="calendar-day empty"></div>
            ))}
            
            {/* Días del mes */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const hasEvent = isEventDay(day);
              const dayEvents = getEventsForDay(day);
              const isToday = day === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear();
              
              return (
                <div
                  key={day}
                  className={`calendar-day ${hasEvent ? 'has-event' : ''} ${isToday ? 'today' : ''}`}
                  title={hasEvent ? `${dayEvents.length} evento(s)` : ''}
                >
                  <span className="day-number">{day}</span>
                  {hasEvent && <span className="event-dot"></span>}
                </div>
              );
            })}
          </div>
          
          {/* Leyenda */}
          <div className="calendar-legend">
            <div className="legend-item">
              <span className="event-dot"></span>
              <span>Día con evento</span>
            </div>
            <div className="legend-item">
              <span className="today-indicator"></span>
              <span>Hoy</span>
            </div>
          </div>
          
          {/* Lista de eventos del mes */}
          {Array.from(eventsByDay.entries())
            .filter(([dateStr]) => {
              const [year, month] = dateStr.split('-').map(Number);
              return year === currentYear && month === currentMonth + 1;
            })
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateStr, dayEvents]) => {
              const [year, month, day] = dateStr.split('-').map(Number);
              return (
                <div key={dateStr} className="calendar-events-list">
                  <h3 className="events-date-header">
                    {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
                  </h3>
                  {dayEvents.map((event) => (
                    <div key={event.id} className="calendar-event-item">
                      <strong>{event.titulo}</strong>
                      {event.hora && <span className="event-time">{event.hora}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default EventCalendar;

