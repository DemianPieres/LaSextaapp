import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  IonModal,
  IonButton,
  IonInput,
  IonToast,
} from '@ionic/react';
import { 
  cameraOutline, 
  lockClosedOutline,
  chevronForwardOutline,
  starSharp,
  logoFacebook,
  logoInstagram,
  eyeOutline,
  eyeOffOutline,
  closeOutline
} from 'ionicons/icons';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserPoints } from '../api/points';
import { changePassword } from '../api/auth';
import './Perfil.css';

const Perfil: React.FC = () => {
  const { session, logout } = useAuth();
  const profile = useMemo(() => session?.profile ?? null, [session]);
  const token = session?.type === 'user' ? session.token : null;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  
  // Estados para modal de cambiar contraseña
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'current' | 'new'>('current');
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

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
      // Error al cargar puntos - no crítico
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

  const handleOpenChangePassword = () => {
    setShowChangePasswordModal(true);
    setPasswordStep('current');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false);
    setPasswordStep('current');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setToastMessage('Por favor, ingresá tu contraseña actual.');
      setToastColor('danger');
      return;
    }

    if (!token) {
      setToastMessage('Error de autenticación. Por favor, iniciá sesión nuevamente.');
      setToastColor('danger');
      return;
    }

    // Verificar la contraseña actual intentando cambiar a la misma
    // Si la contraseña actual es incorrecta, el backend rechazará la operación
    // Avanzamos al siguiente paso y verificaremos en el cambio final
    setPasswordStep('new');
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setToastMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      setToastColor('danger');
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastMessage('Las contraseñas no coinciden.');
      setToastColor('danger');
      return;
    }

    if (!token) {
      setToastMessage('Error de autenticación. Por favor, iniciá sesión nuevamente.');
      setToastColor('danger');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword, token!);
      setToastMessage('Contraseña actualizada exitosamente.');
      setToastColor('success');
      setTimeout(() => {
        handleCloseChangePassword();
      }, 1500);
    } catch (error: any) {
      const message = typeof error?.message === 'string' && error.message !== ''
        ? error.message
        : 'Error al cambiar la contraseña. Verificá que la contraseña actual sea correcta.';
      setToastMessage(message);
      setToastColor('danger');
      
      // Si la contraseña actual es incorrecta, volver al paso 1
      if (message.includes('incorrecta') || message.includes('actual')) {
        setTimeout(() => {
          setPasswordStep('current');
          setCurrentPassword('');
        }, 2000);
      }
    } finally {
      setIsChangingPassword(false);
    }
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
                  <div 
                    className="perfil-avatar"
                    onClick={() => document.getElementById('avatar-input')?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Cambiar foto de perfil"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('avatar-input')?.click();
                      }
                    }}
                  >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('avatar-input')?.click();
                      }}
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

              {/* Menu Options */}
              <div className="perfil-menu">
                <button className="perfil-menu-item" onClick={handleOpenChangePassword}>
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
                  <div
                    className="perfil-footer-logo"
                    onClick={() => window.open('https://www.instagram.com/innova.or/', '_blank')}
                    style={{ cursor: 'pointer' }}
                  >
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

        {/* Modal de Cambiar Contraseña */}
        <IonModal isOpen={showChangePasswordModal} onDidDismiss={handleCloseChangePassword}>
          <IonContent className="change-password-modal-content">
            <div className="change-password-container">
              {/* Header */}
              <div className="change-password-header">
                <h2 className="change-password-title">Modificar Contraseña</h2>
                <button 
                  className="change-password-close-btn"
                  onClick={handleCloseChangePassword}
                  aria-label="Cerrar"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </div>

              {passwordStep === 'current' ? (
                /* Paso 1: Verificar contraseña actual */
                <div className="change-password-step">
                  <p className="change-password-description">
                    Ingresá tu contraseña actual para continuar.
                  </p>
                  <div className="change-password-input-group">
                    <label className="change-password-label">Contraseña Actual</label>
                    <div className="change-password-input-wrapper">
                      <IonInput
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={currentPassword}
                        onIonInput={(e) => setCurrentPassword(e.detail.value!)}
                        className="change-password-input"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className="change-password-eye-btn"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <IonIcon icon={showCurrentPassword ? eyeOffOutline : eyeOutline} />
                      </button>
                    </div>
                  </div>
                  <IonButton
                    className="change-password-btn"
                    expand="block"
                    onClick={handleVerifyCurrentPassword}
                    disabled={isChangingPassword || !currentPassword.trim()}
                  >
                    {isChangingPassword ? 'Verificando...' : 'Continuar'}
                  </IonButton>
                </div>
              ) : (
                /* Paso 2: Nueva contraseña */
                <div className="change-password-step">
                  <p className="change-password-description">
                    Ingresá tu nueva contraseña. Debe tener al menos 6 caracteres.
                  </p>
                  <div className="change-password-input-group">
                    <label className="change-password-label">Nueva Contraseña</label>
                    <div className="change-password-input-wrapper">
                      <IonInput
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onIonInput={(e) => setNewPassword(e.detail.value!)}
                        className="change-password-input"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className="change-password-eye-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <IonIcon icon={showNewPassword ? eyeOffOutline : eyeOutline} />
                      </button>
                    </div>
                  </div>
                  <div className="change-password-input-group">
                    <label className="change-password-label">Confirmar Nueva Contraseña</label>
                    <div className="change-password-input-wrapper">
                      <IonInput
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                        className="change-password-input"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className="change-password-eye-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <IonIcon icon={showConfirmPassword ? eyeOffOutline : eyeOutline} />
                      </button>
                    </div>
                  </div>
                  <div className="change-password-buttons">
                    <IonButton
                      className="change-password-btn-secondary"
                      expand="block"
                      onClick={() => setPasswordStep('current')}
                      disabled={isChangingPassword}
                    >
                      Volver
                    </IonButton>
                    <IonButton
                      className="change-password-btn"
                      expand="block"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !newPassword.trim() || newPassword.length < 6 || newPassword !== confirmPassword}
                    >
                      {isChangingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </IonButton>
                  </div>
                </div>
              )}
            </div>
          </IonContent>
        </IonModal>

        {/* Toast para mensajes */}
        <IonToast
          isOpen={toastMessage !== ''}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Perfil;












