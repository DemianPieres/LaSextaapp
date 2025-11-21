import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { 
  cameraOutline, 
  personOutline, 
  mailOutline, 
  lockClosedOutline,
  chevronForwardOutline,
  starSharp,
  logoFacebook,
  logoInstagram
} from 'ionicons/icons';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserPoints } from '../api/points';
import './Perfil.css';

const Perfil: React.FC = () => {
  const { session, logout } = useAuth();
  const profile = useMemo(() => session?.profile ?? null, [session]);
  const token = session?.type === 'user' ? session.token : null;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  const avatarStorageKey = useMemo(
    () => (profile ? `lasextaapp:avatar:${profile.id}` : null),
    [profile]
  );

  useEffect(() => {
    if (!avatarStorageKey) {
      setAvatarPreview(null);
      return;
    }
    const stored = window.localStorage.getItem(avatarStorageKey);
    if (stored) {
      setAvatarPreview(stored);
    } else {
      setAvatarPreview(null);
    }
  }, [avatarStorageKey]);

  const handleAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !avatarStorageKey) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string | null;
        if (result) {
          window.localStorage.setItem(avatarStorageKey, result);
          setAvatarPreview(result);
        }
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [avatarStorageKey]
  );

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

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  // Recargar puntos cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) {
        void loadPoints();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token, loadPoints]);

  const getInitial = () => {
    if (!profile) return 'U';
    return profile.nombre.charAt(0).toUpperCase();
  };

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="perfil-container">
          {profile ? (
            <>
              {/* Avatar Section */}
              <div className="perfil-avatar-section">
                <div className="perfil-avatar-wrapper">
                  <div className="perfil-avatar">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" />
                    ) : (
                      <div className="perfil-avatar-initial">
                        {getInitial()}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-input"
                      className="perfil-avatar-input"
                      onChange={handleAvatarChange}
                    />
                    <button 
                      className="perfil-avatar-camera-btn"
                      onClick={() => document.getElementById('avatar-input')?.click()}
                      aria-label="Cambiar foto de perfil"
                    >
                      <IonIcon icon={cameraOutline} />
                    </button>
                  </div>
                </div>
                <h2 className="perfil-nombre">{profile.nombre}</h2>
              </div>

              {/* Points Card */}
              <div className="perfil-points-card">
                <div className="perfil-points-header">
                  <span className="perfil-points-title">Tus puntos</span>
                </div>
                <div className="perfil-points-value">
                  <IonIcon icon={starSharp} className="perfil-points-star" />
                  {isLoadingPoints ? (
                    <IonSpinner className="perfil-points-spinner" />
                  ) : (
                    <span className="perfil-points-number">{points}</span>
                  )}
                </div>
                <p className="perfil-points-text">¡Tus compras suman puntos!</p>
              </div>

              {/* Action Button */}
              <button className="perfil-action-btn">
                Ver mis beneficios
              </button>

              {/* Menu Options */}
              <div className="perfil-menu">
                <button className="perfil-menu-item">
                  <div className="perfil-menu-item-left">
                    <IonIcon icon={personOutline} className="perfil-menu-icon" />
                    <span>Mi Perfil</span>
                  </div>
                  <IonIcon icon={chevronForwardOutline} className="perfil-menu-arrow" />
                </button>

                <button className="perfil-menu-item">
                  <div className="perfil-menu-item-left">
                    <IonIcon icon={mailOutline} className="perfil-menu-icon" />
                    <span>Actualizar E-mail</span>
                  </div>
                  <IonIcon icon={chevronForwardOutline} className="perfil-menu-arrow" />
                </button>

                <button className="perfil-menu-item">
                  <div className="perfil-menu-item-left">
                    <IonIcon icon={lockClosedOutline} className="perfil-menu-icon" />
                    <span>Modificar Contraseña</span>
                  </div>
                  <IonIcon icon={chevronForwardOutline} className="perfil-menu-arrow" />
                </button>
              </div>

              {/* Logout Button */}
              <button className="perfil-logout-btn" onClick={logout}>
                Cerrar sesión
              </button>

              {/* Footer */}
              <div className="perfil-footer">
                <p className="perfil-footer-version">App Version: 1.0.0</p>
                <div className="perfil-footer-branding">
                  <span className="perfil-footer-powered">Powered by</span>
                  <div className="perfil-footer-logo">
                    <span className="perfil-footer-quickpass">INNOVA+</span>
                    <IonIcon icon={logoInstagram} className="perfil-footer-fb" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <IonText>No se pudo cargar la información del perfil.</IonText>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Perfil;












