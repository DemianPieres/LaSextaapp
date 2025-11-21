import { IonContent, IonIcon, IonModal, IonPage, IonSpinner, IonText, useIonToast } from '@ionic/react';
import { cashOutline, closeOutline, swapVerticalOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import { fetchUserPoints, fetchUserMovements, generateRedeemCode, type PointsMovement } from '../api/points';
import './Puntos.css';

const MIN_POINTS_TO_REDEEM = 25;

const Puntos: React.FC = () => {
  const { session } = useAuth();
  const [presentToast] = useIonToast();
  const token = session?.type === 'user' ? session.token : null;

  const [points, setPoints] = useState<number>(0);
  const [movements, setMovements] = useState<PointsMovement[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const loadPoints = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingPoints(true);
      const userPoints = await fetchUserPoints(token);
      setPoints(userPoints);
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  }, [token]);

  const loadMovements = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingMovements(true);
      const userMovements = await fetchUserMovements(token);
      setMovements(userMovements);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setIsLoadingMovements(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPoints();
    void loadMovements();
  }, [loadPoints, loadMovements]);

  // Recargar puntos cada 10 segundos para actualización en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) {
        void loadPoints();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token, loadPoints]);

  const handleGenerateRedeemCode = async () => {
    if (!token || points < MIN_POINTS_TO_REDEEM) {
      presentToast({
        message: `Necesitas al menos ${MIN_POINTS_TO_REDEEM} puntos para canjear.`,
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    try {
      setIsGeneratingCode(true);
      const response = await generateRedeemCode(token, points);
      setRedeemCode(response.codigo);
      setIsRedeemModalOpen(true);
      presentToast({
        message: 'Código de canje generado. Válido por 15 minutos.',
        duration: 2500,
        color: 'success',
      });
    } catch (error: any) {
      presentToast({
        message: error.message || 'Error al generar código de canje.',
        duration: 2500,
        color: 'danger',
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const closeRedeemModal = () => {
    setIsRedeemModalOpen(false);
    setRedeemCode(null);
    void loadPoints();
    void loadMovements();
  };

  const canRedeem = points >= MIN_POINTS_TO_REDEEM;

  return (
    <IonPage className="page-with-shared-background">
      <IonContent fullscreen className="page-content">
        <div className="puntos-container">
          {/* Header con puntos */}
          <div className="puntos-header">
            <div className="puntos-header-hexagons">
              <div className="hexagon hexagon-1"></div>
              <div className="hexagon hexagon-2"></div>
              <div className="hexagon hexagon-3"></div>
            </div>
            <div className="puntos-header-content">
              <h1 className="puntos-title">Tus puntos</h1>
              <div className="puntos-balance">
                <div className="puntos-coin-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#FFC107"/>
                    <path d="M12 6L14.5 10.5L19 11.5L15.5 15L16.5 19.5L12 17L7.5 19.5L8.5 15L5 11.5L9.5 10.5L12 6Z" fill="white"/>
                  </svg>
                </div>
                {isLoadingPoints ? (
                  <IonSpinner className="puntos-spinner" />
                ) : (
                  <span className="puntos-number">{points}</span>
                )}
              </div>
            </div>
          </div>

          {/* Botón canjear */}
          <div className="puntos-content">
            <button
              className={`puntos-redeem-btn ${!canRedeem ? 'disabled' : ''}`}
              onClick={handleGenerateRedeemCode}
              disabled={!canRedeem || isGeneratingCode}
            >
              <span>
                {isGeneratingCode ? 'Generando...' : canRedeem ? 'Canjear Mis Puntos' : `Mínimo ${MIN_POINTS_TO_REDEEM} puntos`}
              </span>
              <div className="puntos-redeem-icon">
                <IonIcon icon={cashOutline} />
              </div>
            </button>

            {/* Últimos movimientos */}
            <div className="puntos-movements-section">
              <h2 className="puntos-movements-title">Últimos movimientos</h2>
              
              {isLoadingMovements ? (
                <div className="puntos-loading-state">
                  <IonSpinner />
                  <IonText>Cargando movimientos...</IonText>
                </div>
              ) : movements.length === 0 ? (
                <div className="puntos-empty-state">
                  <div className="puntos-empty-icon">
                    <IonIcon icon={swapVerticalOutline} />
                    <div className="puntos-empty-icon-slash"></div>
                  </div>
                  <p className="puntos-empty-text">
                    Actualmente no hay movimientos en tu cuenta
                  </p>
                </div>
              ) : (
                <div className="puntos-movements-list">
                  {movements.map((movement) => (
                    <div key={movement.id} className="puntos-movement-item">
                      <div className="puntos-movement-info">
                        <span className="puntos-movement-desc">{movement.descripcion}</span>
                        <span className="puntos-movement-date">
                          {new Date(movement.fecha).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      <span className={`puntos-movement-amount ${movement.tipo}`}>
                        {movement.tipo === 'carga' ? '+' : '-'}{movement.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de QR para canje */}
        <IonModal isOpen={isRedeemModalOpen} onDidDismiss={closeRedeemModal} className="puntos-redeem-modal">
          <div className="puntos-modal-content">
            <button className="puntos-modal-close" onClick={closeRedeemModal}>
              <IonIcon icon={closeOutline} />
            </button>
            <h2 className="puntos-modal-title">Código de Canje</h2>
            <p className="puntos-modal-subtitle">Mostrá este código al administrador</p>
            {redeemCode && (
              <div className="puntos-qr-container">
                <QRCode value={redeemCode} size={256} />
                <p className="puntos-modal-code">{redeemCode}</p>
                <p className="puntos-modal-info">Válido por 15 minutos</p>
                <p className="puntos-modal-points">Canjeando: {points} puntos</p>
              </div>
            )}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Puntos;





