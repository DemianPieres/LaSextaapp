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
  giftOutline,
  logOutOutline,
  mailOutline,
  refreshOutline,
  scanOutline,
  ticketOutline,
  starOutline,
  checkmarkOutline,
  closeOutline,
  searchOutline,
  chevronBackOutline,
  chevronForwardOutline,
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
import {
  createAdminBenefit,
  deleteAdminBenefit,
  fetchAdminBenefits,
  updateAdminBenefit,
  type BenefitDto,
} from '../../api/benefits';
import {
  addPointToUser,
  checkPointEligibility,
  validateRedeemCode,
  type ValidateRedeemResponse,
} from '../../api/points';
import {
  createAdminReward,
  deleteAdminReward,
  fetchAdminRewards,
  updateAdminReward,
  type RewardDto,
} from '../../api/rewards';
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

type BenefitFormState = {
  titulo: string;
  descripcionCorta: string;
  descripcionCompleta: string;
  logoUrl: string;
  nombreAuspiciante: string;
  activo: boolean;
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

const DEFAULT_BENEFIT_FORM_STATE: BenefitFormState = {
  titulo: '',
  descripcionCorta: '',
  descripcionCompleta: '',
  logoUrl: '',
  nombreAuspiciante: '',
  activo: true,
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

  const [activeSection, setActiveSection] = useState<'tickets' | 'events' | 'benefits' | 'points'>('tickets');
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

  const [benefits, setBenefits] = useState<BenefitDto[]>([]);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);
  const [benefitFormState, setBenefitFormState] = useState<BenefitFormState>(DEFAULT_BENEFIT_FORM_STATE);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [isSavingBenefit, setIsSavingBenefit] = useState(false);
  const [deletingBenefitId, setDeletingBenefitId] = useState<string | null>(null);
  const [benefitToDelete, setBenefitToDelete] = useState<BenefitDto | null>(null);

  // Estados para puntos y premios
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardFormState, setRewardFormState] = useState({
    nombre: '',
    puntosRequeridos: 10,
    descripcion: '',
    imagenUrl: '',
    habilitado: true,
  });
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<RewardDto | null>(null);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [isValidatingRedeem, setIsValidatingRedeem] = useState(false);
  const [redeemValidationResult, setRedeemValidationResult] = useState<ValidateRedeemResponse | null>(null);
  const [userEligibility, setUserEligibility] = useState<Record<string, boolean>>({});
  const [addingPointUserId, setAddingPointUserId] = useState<string | null>(null);
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [ticketUserSearchFilter, setTicketUserSearchFilter] = useState('');
  const [currentTicketUserPage, setCurrentTicketUserPage] = useState(1);
  const USERS_PER_PAGE = 4;

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

  const loadBenefits = useCallback(async () => {
    if (!adminToken) return;
    setBenefitsLoading(true);
    try {
      const data = await fetchAdminBenefits(adminToken);
      setBenefits(data);
      setBenefitsError(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudieron cargar los beneficios.');
      setBenefitsError(message);
      showToast(message, 'danger');
    } finally {
      setBenefitsLoading(false);
    }
  }, [adminToken, showToast]);

  const loadRewards = useCallback(async () => {
    if (!adminToken) return;
    setRewardsLoading(true);
    try {
      const data = await fetchAdminRewards(adminToken);
      setRewards(data || []);
    } catch (error: unknown) {
      console.error('[admin] Error al cargar premios:', error);
      // No mostrar toast en el error inicial para no interrumpir la carga
      setRewards([]);
    } finally {
      setRewardsLoading(false);
    }
  }, [adminToken]);

  const checkEligibility = useCallback(
    async (userId: string) => {
      if (!adminToken) return;
      try {
        const canAdd = await checkPointEligibility(adminToken, userId);
        setUserEligibility((prev) => ({ ...prev, [userId]: canAdd }));
      } catch (error) {
        console.error('Error al verificar elegibilidad:', error);
      }
    },
    [adminToken]
  );

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
    if (adminToken) {
      void loadBenefits();
      void loadRewards();
    } else {
      setBenefits([]);
      setRewards([]);
    }
  }, [adminToken, loadBenefits, loadRewards]);

  // Cargar elegibilidad cuando se cargan los usuarios o se selecciona uno
  useEffect(() => {
    if (adminToken && selectedUserId) {
      void checkEligibility(selectedUserId);
    }
  }, [adminToken, selectedUserId, checkEligibility]);


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

    // Validar formato de fecha DD/MM/YYYY
    const fechaRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!trimmedTitulo || !trimmedFecha || !trimmedHora || !trimmedDia) {
      showToast('Completá al menos título, fecha, hora y día para guardar el evento.', 'warning');
      return;
    }
    
    if (!fechaRegex.test(trimmedFecha)) {
      showToast('La fecha debe tener el formato DD/MM/YYYY (ejemplo: 22/11/2025).', 'warning');
      return;
    }
    
    // Validar que la fecha sea válida
    const [dia, mes, año] = trimmedFecha.split('/').map(Number);
    const fechaObj = new Date(año, mes - 1, dia);
    if (fechaObj.getDate() !== dia || fechaObj.getMonth() !== mes - 1 || fechaObj.getFullYear() !== año) {
      showToast('La fecha ingresada no es válida.', 'warning');
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

  const handleOpenCreateBenefit = () => {
    setEditingBenefitId(null);
    setBenefitFormState(DEFAULT_BENEFIT_FORM_STATE);
    setIsBenefitModalOpen(true);
  };

  const handleEditBenefit = (benefit: BenefitDto) => {
    setEditingBenefitId(benefit.id);
    setBenefitFormState({
      titulo: benefit.titulo,
      descripcionCorta: benefit.descripcionCorta,
      descripcionCompleta: benefit.descripcionCompleta,
      logoUrl: benefit.logoUrl,
      nombreAuspiciante: benefit.nombreAuspiciante,
      activo: benefit.activo,
    });
    setIsBenefitModalOpen(true);
  };

  const handleCloseBenefitModal = () => {
    setIsBenefitModalOpen(false);
    setEditingBenefitId(null);
    setBenefitFormState(DEFAULT_BENEFIT_FORM_STATE);
  };

  const handleSubmitBenefit = async () => {
    if (!adminToken) return;

    const trimmedTitulo = benefitFormState.titulo.trim();
    const trimmedDescCorta = benefitFormState.descripcionCorta.trim();
    const trimmedDescCompleta = benefitFormState.descripcionCompleta.trim();
    const trimmedLogoUrl = benefitFormState.logoUrl.trim();
    const trimmedNombreAuspiciante = benefitFormState.nombreAuspiciante.trim();

    if (!trimmedTitulo || !trimmedDescCorta || !trimmedDescCompleta || !trimmedLogoUrl || !trimmedNombreAuspiciante) {
      showToast('Completá todos los campos para guardar el beneficio.', 'warning');
      return;
    }

    const payload = {
      titulo: trimmedTitulo,
      descripcionCorta: trimmedDescCorta,
      descripcionCompleta: trimmedDescCompleta,
      logoUrl: trimmedLogoUrl,
      nombreAuspiciante: trimmedNombreAuspiciante,
      activo: benefitFormState.activo,
    };

    setIsSavingBenefit(true);
    try {
      if (editingBenefitId) {
        await updateAdminBenefit(adminToken, editingBenefitId, payload);
        showToast('Beneficio actualizado correctamente.');
      } else {
        await createAdminBenefit(adminToken, payload);
        showToast('Beneficio creado correctamente.');
      }
      handleCloseBenefitModal();
      await loadBenefits();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo guardar el beneficio. Intenta nuevamente.');
      showToast(message, 'danger');
    } finally {
      setIsSavingBenefit(false);
    }
  };

  // Funciones para puntos y premios
  const handleAddPoint = async (userId: string) => {
    if (!adminToken) return;
    setAddingPointUserId(userId);
    try {
      await addPointToUser(adminToken, userId);
      showToast('Punto agregado correctamente.');
      await loadUsers();
      await checkEligibility(userId);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo agregar el punto. Intenta nuevamente.');
      showToast(message, 'danger');
    } finally {
      setAddingPointUserId(null);
    }
  };

  const handleValidateRedeemCode = async () => {
    if (!adminToken || !redeemCodeInput.trim()) {
      showToast('Ingresá un código de canje.', 'warning');
      return;
    }
    setIsValidatingRedeem(true);
    setRedeemValidationResult(null);
    try {
      const result = await validateRedeemCode(adminToken, redeemCodeInput.trim());
      setRedeemValidationResult(result);
      showToast(result.message, 'success');
      setRedeemCodeInput('');
      await loadUsers();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Error al validar el código de canje.');
      showToast(message, 'danger');
    } finally {
      setIsValidatingRedeem(false);
    }
  };

  const handleScanRedeemCode = async () => {
    if (!adminToken) return;
    try {
      setIsScanning(true);
      const result = (await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Apuntá la cámara al código QR de canje',
        scanText: 'Escanear',
      })) as CapacitorBarcodeScannerScanResult;

      setIsScanning(false);

      const code = result?.ScanResult ?? null;

      if (code) {
        setRedeemCodeInput(code);
        await handleValidateRedeemCode();
      } else {
        showToast('No se detectó ningún código QR.', 'warning');
      }
    } catch (error: any) {
      if (error.message !== 'User canceled' && error.message !== 'User cancelled') {
        console.error('[admin] Error al escanear QR:', error);
        showToast('No se pudo utilizar la cámara. Ingresá el código manualmente.', 'danger');
      }
      setIsScanning(false);
    }
  };

  const handleEditReward = (reward: RewardDto) => {
    setEditingRewardId(reward.id);
    setRewardFormState({
      nombre: reward.nombre,
      puntosRequeridos: reward.puntosRequeridos,
      descripcion: reward.descripcion,
      imagenUrl: reward.imagenUrl ?? '',
      habilitado: reward.habilitado,
    });
    setIsRewardModalOpen(true);
  };

  const handleCloseRewardModal = () => {
    setIsRewardModalOpen(false);
    setEditingRewardId(null);
    setRewardFormState({
      nombre: '',
      puntosRequeridos: 10,
      descripcion: '',
      imagenUrl: '',
      habilitado: true,
    });
  };

  const handleSubmitReward = async () => {
    if (!adminToken) return;

    const trimmedNombre = rewardFormState.nombre.trim();
    const trimmedDescripcion = rewardFormState.descripcion.trim();

    if (!trimmedNombre || !trimmedDescripcion) {
      showToast('Completá todos los campos obligatorios.', 'warning');
      return;
    }

    if (rewardFormState.puntosRequeridos < 1) {
      showToast('Los puntos requeridos deben ser mayor a 0.', 'warning');
      return;
    }

    const payload = {
      nombre: trimmedNombre,
      puntosRequeridos: rewardFormState.puntosRequeridos,
      descripcion: trimmedDescripcion,
      imagenUrl: rewardFormState.imagenUrl.trim() || undefined,
      habilitado: rewardFormState.habilitado,
    };

    setIsSavingReward(true);
    try {
      if (editingRewardId) {
        await updateAdminReward(adminToken, editingRewardId, payload);
        showToast('Premio actualizado correctamente.');
      } else {
        await createAdminReward(adminToken, payload);
        showToast('Premio creado correctamente.');
      }
      handleCloseRewardModal();
      await loadRewards();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo guardar el premio. Intenta nuevamente.');
      showToast(message, 'danger');
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!adminToken) return;
    setDeletingRewardId(rewardId);
    try {
      await deleteAdminReward(adminToken, rewardId);
      showToast('Premio eliminado correctamente.');
      await loadRewards();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo eliminar el premio. Intenta nuevamente.');
      showToast(message, 'danger');
    } finally {
      setDeletingRewardId(null);
    }
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    if (!adminToken) return;
    setDeletingBenefitId(benefitId);
    try {
      await deleteAdminBenefit(adminToken, benefitId);
      showToast('Beneficio eliminado correctamente.');
      await loadBenefits();
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'No se pudo eliminar el beneficio.');
      showToast(message, 'danger');
    } finally {
      setDeletingBenefitId(null);
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

  // Filtrar usuarios por nombre o email
  const filteredUsers = useMemo(() => {
    if (!userSearchFilter.trim()) {
      return users;
    }
    const filter = userSearchFilter.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.nombre.toLowerCase().includes(filter) ||
        user.email.toLowerCase().includes(filter)
    );
  }, [users, userSearchFilter]);

  // Paginación de usuarios
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentUserPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentUserPage]);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentUserPage(1);
  }, [userSearchFilter]);

  // Filtrar usuarios para la sección de tickets
  const filteredTicketUsers = useMemo(() => {
    if (!ticketUserSearchFilter.trim()) {
      return users;
    }
    const filter = ticketUserSearchFilter.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.nombre.toLowerCase().includes(filter) ||
        user.email.toLowerCase().includes(filter)
    );
  }, [users, ticketUserSearchFilter]);

  // Paginación de usuarios para tickets
  const totalTicketUserPages = Math.ceil(filteredTicketUsers.length / USERS_PER_PAGE);
  const paginatedTicketUsers = useMemo(() => {
    const startIndex = (currentTicketUserPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    return filteredTicketUsers.slice(startIndex, endIndex);
  }, [filteredTicketUsers, currentTicketUserPage]);

  // Resetear página de tickets cuando cambia el filtro
  useEffect(() => {
    setCurrentTicketUserPage(1);
  }, [ticketUserSearchFilter]);

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
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
              <IonIcon icon={activeSection === 'tickets' ? ticketOutline : activeSection === 'events' ? calendarOutline : activeSection === 'benefits' ? giftOutline : starOutline} />
            </div>
            <div className="tickets-heading">
              <h1>
                {activeSection === 'tickets' ? 'Gestión de Tickets' : activeSection === 'events' ? 'Gestión de Eventos' : activeSection === 'benefits' ? 'Gestión de Beneficios' : 'Gestión de Puntos y Premios'}
              </h1>
              <p>
                {activeSection === 'tickets'
                  ? 'Emití, enviá y validá códigos QR en tiempo real. Todos los cambios se reflejan automáticamente en los usuarios.'
                  : activeSection === 'events'
                  ? 'Creá, editá y eliminá eventos. Los usuarios verán las actualizaciones al instante sin recargar la app.'
                  : activeSection === 'benefits'
                  ? 'Creá, editá y eliminá beneficios con descuentos exclusivos para los usuarios.'
                  : 'Gestioná puntos de usuarios y premios canjeables. Validá códigos QR de canje.'}
              </p>
            </div>
          </header>

          <IonSegment
            value={activeSection}
            onIonChange={(event) => {
              const value = (event.detail.value as 'tickets' | 'events' | 'benefits' | 'points') ?? 'tickets';
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
            <IonSegmentButton value="benefits">
              <IonLabel>Beneficios</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="points">
              <IonLabel>Puntos</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {activeSection === 'tickets' ? (
            <div className="admin-tickets-container">
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Usuarios</IonCardTitle>
                      <IonCardSubtitle>Seleccioná un usuario para gestionar sus tickets</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                        <IonIcon icon={searchOutline} style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '18px' }} />
                        <IonText style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                          Buscá usuarios por nombre o email
                        </IonText>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <IonItem style={{ flex: 1, minWidth: '200px', '--background': 'rgba(255, 255, 255, 0.05)', '--border-radius': '8px' }}>
                          <IonIcon icon={searchOutline} slot="start" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                          <IonInput
                            placeholder="Buscar por nombre o email..."
                            value={ticketUserSearchFilter}
                            onIonInput={(e) => setTicketUserSearchFilter(e.detail.value ?? '')}
                            style={{ '--color': 'white' }}
                          />
                        </IonItem>
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
                      ) : filteredTicketUsers.length === 0 ? (
                        <IonText color="medium">
                          {ticketUserSearchFilter.trim() ? 'No se encontraron usuarios con ese criterio de búsqueda.' : 'No hay usuarios registrados.'}
                        </IonText>
                      ) : (
                        <>
                          <IonList>
                            {paginatedTicketUsers.map((user) => (
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
                          {totalTicketUserPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                              <IonButton
                                size="small"
                                color="medium"
                                disabled={currentTicketUserPage === 1}
                                onClick={() => setCurrentTicketUserPage((prev) => Math.max(1, prev - 1))}
                              >
                                <IonIcon icon={chevronBackOutline} slot="start" />
                                Anterior
                              </IonButton>
                              <IonText style={{ color: 'white', fontSize: '14px' }}>
                                Página {currentTicketUserPage} de {totalTicketUserPages} ({filteredTicketUsers.length} usuario{filteredTicketUsers.length !== 1 ? 's' : ''})
                              </IonText>
                              <IonButton
                                size="small"
                                color="medium"
                                disabled={currentTicketUserPage === totalTicketUserPages}
                                onClick={() => setCurrentTicketUserPage((prev) => Math.min(totalTicketUserPages, prev + 1))}
                              >
                                Siguiente
                                <IonIcon icon={chevronForwardOutline} slot="end" />
                              </IonButton>
                            </div>
                          )}
                        </>
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
            </div>
          ) : activeSection === 'events' ? (
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
          ) : activeSection === 'benefits' ? (
            <section className="admin-events-container">
              <div className="admin-events-toolbar">
                <div>
                  <h2>Beneficios publicados</h2>
                  <p>
                    Publicá y administrá los beneficios que ven los clientes. Los cambios se reflejan de inmediato en la app.
                  </p>
                </div>
                <div className="admin-events-actions">
                  <IonButton onClick={handleOpenCreateBenefit}>
                    <IonIcon icon={addOutline} slot="start" />
                    Nuevo beneficio
                  </IonButton>
                  <IonButton color="medium" onClick={() => void loadBenefits()} disabled={benefitsLoading}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    Actualizar
                  </IonButton>
                </div>
              </div>

              {benefitsLoading ? (
                <div className="admin-events-feedback">
                  <IonSpinner />
                  <IonText>Cargando beneficios...</IonText>
                </div>
              ) : benefitsError ? (
                <div className="admin-events-feedback">
                  <IonText color="danger">{benefitsError}</IonText>
                </div>
              ) : benefits.length === 0 ? (
                <div className="admin-events-feedback">
                  <IonText color="medium">
                    No hay beneficios publicados todavía. Creá el primero para que los clientes lo vean en la app.
                  </IonText>
                </div>
              ) : (
                <div className="admin-benefits-list">
                  {benefits.map((benefit) => (
                    <div key={benefit.id} className="admin-benefit-card">
                      <div className="admin-benefit-main">
                        <div className="admin-benefit-logo">
                          <img src={benefit.logoUrl} alt={benefit.nombreAuspiciante} />
                        </div>
                        <div className="admin-benefit-content">
                          <h3>{benefit.titulo}</h3>
                          <p className="admin-benefit-short">{benefit.descripcionCorta}</p>
                          <p className="admin-benefit-sponsor">
                            <strong>Auspiciante:</strong> {benefit.nombreAuspiciante}
                          </p>
                          <IonBadge color={benefit.activo ? 'success' : 'medium'}>
                            {benefit.activo ? 'Activo' : 'Inactivo'}
                          </IonBadge>
                        </div>
                      </div>
                      <div className="admin-benefit-actions">
                        <IonButton
                          size="small"
                          color="tertiary"
                          onClick={() => handleEditBenefit(benefit)}
                        >
                          Editar
                        </IonButton>
                        <IonButton
                          size="small"
                          color="danger"
                          onClick={() => setBenefitToDelete(benefit)}
                          disabled={deletingBenefitId === benefit.id}
                        >
                          {deletingBenefitId === benefit.id ? 'Eliminando...' : 'Eliminar'}
                        </IonButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activeSection === 'points' ? (
            <div className="admin-points-container">
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeLg="4">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Agregar Puntos</IonCardTitle>
                      <IonCardSubtitle>Seleccioná un usuario para agregarle puntos</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                        <IonIcon icon={searchOutline} style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '18px' }} />
                        <IonText style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                          Buscá usuarios por nombre o email
                        </IonText>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <IonItem style={{ flex: 1, minWidth: '200px', '--background': 'rgba(255, 255, 255, 0.05)', '--border-radius': '8px' }}>
                          <IonIcon icon={searchOutline} slot="start" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                          <IonInput
                            placeholder="Buscar por nombre o email..."
                            value={userSearchFilter}
                            onIonInput={(e) => setUserSearchFilter(e.detail.value ?? '')}
                            style={{ '--color': 'white' }}
                          />
                        </IonItem>
                        <IonButton
                          size="small"
                          color="medium"
                          onClick={() => {
                            void loadUsers();
                            if (selectedUserId) {
                              void checkEligibility(selectedUserId);
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
                      ) : filteredUsers.length === 0 ? (
                        <IonText color="medium">
                          {userSearchFilter.trim() ? 'No se encontraron usuarios con ese criterio de búsqueda.' : 'No hay usuarios registrados.'}
                        </IonText>
                      ) : (
                        <>
                          <IonList>
                            {paginatedUsers.map((user) => {
                              const canAdd = userEligibility[user.id] !== false && userEligibility[user.id] !== undefined ? userEligibility[user.id] : true;
                              const isAdding = addingPointUserId === user.id;
                              return (
                                <IonItem key={user.id} button detail onClick={() => setSelectedUserId(user.id)}>
                                  <IonLabel>
                                    <h2>{user.nombre}</h2>
                                    <p>{user.email}</p>
                                  </IonLabel>
                                  <IonButton
                                    size="small"
                                    color={canAdd ? 'success' : 'medium'}
                                    disabled={!canAdd || isAdding}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleAddPoint(user.id);
                                    }}
                                  >
                                    {isAdding ? 'Agregando...' : canAdd ? 'Agregar 1 punto' : 'Ya agregado hoy'}
                                  </IonButton>
                                </IonItem>
                              );
                            })}
                          </IonList>
                          {totalUserPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                              <IonButton
                                size="small"
                                color="medium"
                                disabled={currentUserPage === 1}
                                onClick={() => setCurrentUserPage((prev) => Math.max(1, prev - 1))}
                              >
                                <IonIcon icon={chevronBackOutline} slot="start" />
                                Anterior
                              </IonButton>
                              <IonText style={{ color: 'white', fontSize: '14px' }}>
                                Página {currentUserPage} de {totalUserPages} ({filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''})
                              </IonText>
                              <IonButton
                                size="small"
                                color="medium"
                                disabled={currentUserPage === totalUserPages}
                                onClick={() => setCurrentUserPage((prev) => Math.min(totalUserPages, prev + 1))}
                              >
                                Siguiente
                                <IonIcon icon={chevronForwardOutline} slot="end" />
                              </IonButton>
                            </div>
                          )}
                        </>
                      )}
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Validar Canje</IonCardTitle>
                      <IonCardSubtitle>Escaneá o ingresá manualmente un código QR de canje</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent className="admin-validation-card">
                      <IonTextarea
                        value={redeemCodeInput}
                        placeholder="Ej: REDEEM-ABC12345"
                        autoGrow
                        onIonInput={(event) => setRedeemCodeInput(event.detail.value ?? '')}
                      />
                      <div className="admin-validation-actions">
                        <IonButton onClick={handleValidateRedeemCode} disabled={isValidatingRedeem}>
                          <IonIcon icon={checkmarkOutline} slot="start" />
                          Validar código
                        </IonButton>
                        <IonButton
                          color="tertiary"
                          onClick={handleScanRedeemCode}
                          disabled={isScanning && Capacitor.isNativePlatform()}
                        >
                          <IonIcon icon={scanOutline} slot="start" />
                          {isScanning ? 'Escaneando...' : 'Escanear'}
                        </IonButton>
                      </div>
                      {redeemValidationResult && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                          <IonText color="success">
                            <strong>Canje validado:</strong>
                            <br />
                            Usuario: {redeemValidationResult.usuario}
                            <br />
                            Premio: {redeemValidationResult.reward?.nombre || 'N/A'}
                            <br />
                            Puntos canjeados: {redeemValidationResult.puntosCanjeados}
                            <br />
                            Puntos restantes: {redeemValidationResult.puntosRestantes}
                          </IonText>
                        </div>
                      )}
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
                      <IonCardTitle>Gestión de Premios</IonCardTitle>
                      <IonCardSubtitle>Creá, editá y eliminá premios canjeables</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
                        <IonButton onClick={() => {
                          setEditingRewardId(null);
                          setRewardFormState({
                            nombre: '',
                            puntosRequeridos: 10,
                            descripcion: '',
                            imagenUrl: '',
                            habilitado: true,
                          });
                          setIsRewardModalOpen(true);
                        }}>
                          <IonIcon icon={addOutline} slot="start" />
                          Nuevo premio
                        </IonButton>
                        <IonButton color="medium" onClick={() => void loadRewards()} disabled={rewardsLoading}>
                          <IonIcon icon={refreshOutline} slot="start" />
                          Actualizar
                        </IonButton>
                      </div>

                      {rewardsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                          <IonSpinner />
                        </div>
                      ) : rewards.length === 0 ? (
                        <IonText color="medium">No hay premios creados todavía. Creá el primero para que los usuarios puedan canjearlo.</IonText>
                      ) : (
                        <IonList>
                          {rewards.map((reward) => (
                            <IonItem key={reward.id} className="admin-reward-item">
                              <IonLabel className="admin-reward-label">
                                <div className="admin-reward-content">
                                  {reward.imagenUrl && (
                                    <div className="admin-reward-image">
                                      <img
                                        src={reward.imagenUrl}
                                        alt={reward.nombre}
                                      />
                                    </div>
                                  )}
                                  <div className="admin-reward-info">
                                    <h3>{reward.nombre}</h3>
                                    <p>{reward.descripcion}</p>
                                    <div className="admin-reward-badges">
                                      <IonBadge color="warning">{reward.puntosRequeridos} puntos</IonBadge>
                                      <IonBadge color={reward.habilitado ? 'success' : 'medium'}>
                                        {reward.habilitado ? 'Habilitado' : 'Deshabilitado'}
                                      </IonBadge>
                                    </div>
                                  </div>
                                </div>
                              </IonLabel>
                              <div className="admin-reward-actions" slot="end">
                                <IonButton
                                  size="small"
                                  color="tertiary"
                                  onClick={() => handleEditReward(reward)}
                                >
                                  Editar
                                </IonButton>
                                <IonButton
                                  size="small"
                                  color="danger"
                                  onClick={() => setRewardToDelete(reward)}
                                  disabled={deletingRewardId === reward.id}
                                >
                                  {deletingRewardId === reward.id ? 'Eliminando...' : 'Eliminar'}
                                </IonButton>
                              </div>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonCardContent>
                  </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          ) : null}
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
                <IonLabel position="stacked">Fecha (DD/MM/YYYY) *</IonLabel>
                <IonInput
                  value={eventFormState.fecha}
                  placeholder="Ej: 22/11/2025"
                  required
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

        <IonModal isOpen={isBenefitModalOpen} onDidDismiss={handleCloseBenefitModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingBenefitId ? 'Editar beneficio' : 'Nuevo beneficio'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseBenefitModal}>
                Cerrar
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="full">
              <IonItem>
                <IonLabel position="stacked">Título</IonLabel>
                <IonInput
                  value={benefitFormState.titulo}
                  placeholder="Ej: 10% de descuento"
                  onIonChange={(event) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      titulo: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción corta</IonLabel>
                <IonInput
                  value={benefitFormState.descripcionCorta}
                  placeholder="Ej: en todas las consumiciones"
                  onIonChange={(event) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      descripcionCorta: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción completa</IonLabel>
                <IonTextarea
                  value={benefitFormState.descripcionCompleta}
                  autoGrow
                  placeholder="Descripción detallada del beneficio que se mostrará al expandir la card"
                  onIonChange={(event) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      descripcionCompleta: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Logo URL</IonLabel>
                <IonInput
                  value={benefitFormState.logoUrl}
                  placeholder="https://... o /logo.png"
                  onIonChange={(event) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      logoUrl: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Nombre del auspiciante</IonLabel>
                <IonInput
                  value={benefitFormState.nombreAuspiciante}
                  placeholder="Ej: Coca Cola"
                  onIonChange={(event) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      nombreAuspiciante: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel>Activo</IonLabel>
                <input
                  type="checkbox"
                  checked={benefitFormState.activo}
                  onChange={(e) =>
                    setBenefitFormState((prev) => ({
                      ...prev,
                      activo: e.target.checked,
                    }))
                  }
                  style={{ marginLeft: 'auto' }}
                />
              </IonItem>
            </IonList>
            <IonButton
              expand="block"
              style={{ marginTop: '24px' }}
              onClick={handleSubmitBenefit}
              disabled={isSavingBenefit}
            >
              {isSavingBenefit
                ? 'Guardando...'
                : editingBenefitId
                ? 'Actualizar beneficio'
                : 'Crear beneficio'}
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={benefitToDelete !== null}
          header="Eliminar beneficio"
          message={`¿Seguro que querés eliminar "${benefitToDelete?.titulo}"? Esta acción no se puede deshacer.`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                const benefitId = benefitToDelete?.id;
                if (benefitId) {
                  void handleDeleteBenefit(benefitId);
                }
              },
            },
          ]}
          onDidDismiss={() => setBenefitToDelete(null)}
        />

        <IonModal isOpen={isRewardModalOpen} onDidDismiss={handleCloseRewardModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingRewardId ? 'Editar premio' : 'Nuevo premio'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={handleCloseRewardModal}>
                Cerrar
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList lines="full">
              <IonItem>
                <IonLabel position="stacked">Nombre del premio *</IonLabel>
                <IonInput
                  value={rewardFormState.nombre}
                  placeholder="Ej: Bebida consumible"
                  onIonChange={(event) =>
                    setRewardFormState((prev) => ({
                      ...prev,
                      nombre: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Puntos requeridos *</IonLabel>
                <IonInput
                  type="number"
                  value={rewardFormState.puntosRequeridos}
                  min={1}
                  onIonInput={(event) =>
                    setRewardFormState((prev) => ({
                      ...prev,
                      puntosRequeridos: Number(event.detail.value ?? 10),
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción *</IonLabel>
                <IonTextarea
                  value={rewardFormState.descripcion}
                  autoGrow
                  placeholder="Descripción del premio"
                  onIonChange={(event) =>
                    setRewardFormState((prev) => ({
                      ...prev,
                      descripcion: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">URL de imagen (opcional)</IonLabel>
                <IonInput
                  value={rewardFormState.imagenUrl}
                  placeholder="URL pública de la imagen"
                  onIonChange={(event) =>
                    setRewardFormState((prev) => ({
                      ...prev,
                      imagenUrl: event.detail.value?.toString() ?? '',
                    }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel>Habilitado</IonLabel>
                <input
                  type="checkbox"
                  checked={rewardFormState.habilitado}
                  onChange={(e) =>
                    setRewardFormState((prev) => ({
                      ...prev,
                      habilitado: e.target.checked,
                    }))
                  }
                  style={{ marginLeft: 'auto' }}
                />
              </IonItem>
            </IonList>
            <IonButton
              expand="block"
              style={{ marginTop: '24px' }}
              onClick={handleSubmitReward}
              disabled={isSavingReward}
            >
              {isSavingReward
                ? 'Guardando...'
                : editingRewardId
                ? 'Actualizar premio'
                : 'Crear premio'}
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={rewardToDelete !== null}
          header="Eliminar premio"
          message={`¿Seguro que querés eliminar "${rewardToDelete?.nombre}"? Esta acción no se puede deshacer.`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                const rewardId = rewardToDelete?.id;
                if (rewardId) {
                  void handleDeleteReward(rewardId);
                }
              },
            },
          ]}
          onDidDismiss={() => setRewardToDelete(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;

