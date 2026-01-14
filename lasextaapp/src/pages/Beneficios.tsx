import { IonContent, IonHeader, IonIcon, IonPage, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { chevronDownOutline, chevronUpOutline, giftOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import { fetchBenefits, type BenefitDto } from '../api/benefits';
import './Beneficios.css';

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

const Beneficios: React.FC = () => {
  const [benefits, setBenefits] = useState<BenefitDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedBenefitId, setExpandedBenefitId] = useState<string | null>(null);

  const loadBenefits = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchBenefits();
      setBenefits(data.filter(b => b.activo));
      setErrorMessage(null);
    } catch (error: unknown) {
      const message = resolveErrorMessage(error, 'No pudimos cargar los beneficios. Intenta nuevamente.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBenefits();
  }, [loadBenefits]);

  const toggleExpand = (benefitId: string) => {
    setExpandedBenefitId(prev => prev === benefitId ? null : benefitId);
  };

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Beneficios</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="beneficios-container">
          <div className="beneficios-header">
            <div className="beneficios-icon">
              <IonIcon icon={giftOutline} />
            </div>
            <div className="beneficios-heading">
              <h1>Tus Beneficios</h1>
              <p>Descuentos exclusivos para vos</p>
            </div>
          </div>

          <div className="beneficios-content">
            {isLoading ? (
              <div className="beneficios-loading">
                <IonSpinner />
                <IonText>Cargando beneficios...</IonText>
              </div>
            ) : errorMessage ? (
              <div className="beneficios-error">
                <IonText color="danger">{errorMessage}</IonText>
              </div>
            ) : benefits.length === 0 ? (
              <div className="beneficios-empty">
                <IonIcon icon={giftOutline} className="beneficios-empty-icon" />
                <IonText>No hay beneficios disponibles en este momento</IonText>
              </div>
            ) : (
              <div className="beneficios-list">
                {benefits.map((benefit) => {
                  const isExpanded = expandedBenefitId === benefit.id;
                  return (
                    <div 
                      key={benefit.id} 
                      className={`beneficio-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleExpand(benefit.id)}
                    >
                      <div className="beneficio-card-header">
                        <div className="beneficio-card-content">
                          <h3 className="beneficio-titulo">{benefit.titulo}</h3>
                          <p className="beneficio-descripcion-corta">{benefit.descripcionCorta}</p>
                          {isExpanded && (
                            <p className="beneficio-descripcion-completa">{benefit.descripcionCompleta}</p>
                          )}
                        </div>
                        <div className="beneficio-card-right">
                          <div className="beneficio-logo-wrapper">
                            <img 
                              src={benefit.logoUrl} 
                              alt={benefit.nombreAuspiciante}
                              className="beneficio-logo"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                          <IonIcon 
                            icon={isExpanded ? chevronUpOutline : chevronDownOutline} 
                            className="beneficio-expand-icon"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Beneficios;