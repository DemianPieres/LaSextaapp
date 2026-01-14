import {
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { calendarOutline, closeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import type { EventDto } from '../api/events';
import './EventCalendar.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  events: EventDto[];
};

type CalendarDay = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  dateKey: string;
};

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseEventDate(event: EventDto): Date | null {
  // Intentar parsear fecha directa (ISO o compatible)
  const direct = new Date(event.fecha);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  // Fallback: intentar formato DD/MM/YYYY
  const parts = event.fecha.split(/[/-]/);
  if (parts.length === 3) {
    const [dayStr, monthStr, yearStr] = parts;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

const EventCalendar: React.FC<Props> = ({ isOpen, onClose, events }) => {
  const eventsWithDate = useMemo(
    () =>
      events
        .map((e) => {
          const parsed = parseEventDate(e);
          return parsed ? { event: e, date: parsed } : null;
        })
        .filter((v): v is { event: EventDto; date: Date } => v !== null),
    [events]
  );

  const initialReferenceDate = eventsWithDate[0]?.date ?? new Date();

  const [currentYear, setCurrentYear] = useState(initialReferenceDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialReferenceDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, EventDto[]>();
    for (const { event, date } of eventsWithDate) {
      const key = toDateKey(date);
      const list = map.get(key);
      if (list === undefined) {
        map.set(key, [event]);
      } else {
        list.push(event);
      }
    }
    return map;
  }, [eventsWithDate]);

  const todayKey = toDateKey(new Date());

  const calendarDays: CalendarDay[] = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Día de la semana (lunes = 0)
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;

    const days: CalendarDay[] = [];

    // Días del mes anterior que completan la primera fila
    if (startWeekday > 0) {
      const lastDayPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      for (let i = startWeekday - 1; i >= 0; i--) {
        const dayNumber = lastDayPrevMonth - i;
        const date = new Date(currentYear, currentMonth - 1, dayNumber);
        const key = toDateKey(date);
        days.push({
          date,
          inCurrentMonth: false,
          dateKey: key,
          hasEvents: eventsByDateKey.has(key),
          isToday: key === todayKey,
        });
      }
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const key = toDateKey(date);
      days.push({
        date,
        inCurrentMonth: true,
        dateKey: key,
        hasEvents: eventsByDateKey.has(key),
        isToday: key === todayKey,
      });
    }

    // Días del siguiente mes para completar filas (hasta 6 filas)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      const key = toDateKey(date);
      days.push({
        date,
        inCurrentMonth: false,
        dateKey: key,
        hasEvents: eventsByDateKey.has(key),
        isToday: key === todayKey,
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDateKey, todayKey]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDay = (day: CalendarDay) => {
    if (!day.inCurrentMonth) {
      return;
    }
    setSelectedDateKey(day.dateKey);
  };

  const selectedEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    return eventsByDateKey.get(selectedDateKey) ?? [];
  }, [eventsByDateKey, selectedDateKey]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return null;
    const [year, month, day] = selectedDateKey.split('-').map((v) => Number(v));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDateKey]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="event-calendar-modal">
      <IonHeader>
        <IonToolbar className="event-calendar-toolbar">
          <div className="event-calendar-header">
            <div className="event-calendar-title-container">
              <IonIcon icon={calendarOutline} className="event-calendar-icon" />
              <IonTitle className="event-calendar-title">Calendario de eventos</IonTitle>
            </div>
            <button className="event-calendar-close-btn" type="button" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="event-calendar-content">
        {eventsWithDate.length === 0 ? (
          <p className="event-calendar-empty">
            Todavía no hay eventos cargados. Volvé a intentarlo más tarde.
          </p>
        ) : (
          <div className="event-calendar-layout">
            <div className="event-calendar-month-header">
              <button
                type="button"
                className="event-calendar-nav-btn"
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
              >
                <IonIcon icon={chevronBackOutline} />
              </button>
              <div className="event-calendar-month-label">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </div>
              <button
                type="button"
                className="event-calendar-nav-btn"
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
              >
                <IonIcon icon={chevronForwardOutline} />
              </button>
            </div>

            <div className="event-calendar-grid">
              {WEEKDAY_SHORT.map((wd) => (
                <div key={wd} className="event-calendar-weekday">
                  {wd}
                </div>
              ))}
              {calendarDays.map((day) => (
                <button
                  key={day.dateKey + (day.inCurrentMonth ? '' : '-out')}
                  type="button"
                  className={[
                    'event-calendar-day-cell',
                    day.inCurrentMonth ? 'current-month' : 'other-month',
                    day.hasEvents ? 'has-events' : '',
                    day.isToday ? 'today' : '',
                    selectedDateKey === day.dateKey ? 'selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectDay(day)}
                >
                  <span className="event-calendar-day-number">{day.date.getDate()}</span>
                  {day.hasEvents && <span className="event-calendar-dot" />}
                </button>
              ))}
            </div>

            <div className="event-calendar-events-panel">
              {selectedEvents.length === 0 ? (
                <p className="event-calendar-hint">
                  Tocá un día marcado en verde para ver los eventos programados.
                </p>
              ) : (
                <>
                  {selectedDateLabel && (
                    <p className="event-calendar-selected-date">{selectedDateLabel}</p>
                  )}
                  <div className="event-calendar-events-list">
                    {selectedEvents.map((event) => (
                      <div key={event.id} className="event-calendar-item">
                        <div className="event-calendar-item-header">
                          <span className="event-calendar-item-time">{event.hora}</span>
                          <span className="event-calendar-item-location">{event.ubicacion}</span>
                        </div>
                        <h3 className="event-calendar-event-title">{event.titulo}</h3>
                        {event.descripcion && (
                          <p className="event-calendar-description">{event.descripcion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default EventCalendar;


