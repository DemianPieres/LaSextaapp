import {
  IonAvatar,
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
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline, cameraOutline, mailOutline, calendarOutline } from 'ionicons/icons';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Perfil.css';

const Perfil: React.FC = () => {
  const { session, logout } = useAuth();
  const profile = useMemo(() => session?.profile ?? null, [session]);
  const isAdmin = session?.type === 'admin';
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="content-container">
          <IonCard className="profile-card">
            <IonCardHeader>
              <IonCardTitle>Información de la cuenta</IonCardTitle>
              <IonCardSubtitle>Datos personales y sesión activa</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              {profile ? (
                <>
                  <div className="profile-avatar-wrapper">
                    <IonAvatar className="profile-avatar">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar del usuario" />
                      ) : (
                        <div className="profile-avatar-placeholder">
                          {profile.nombre
                            .split(' ')
                            .map((part) => part.charAt(0).toUpperCase())
                            .slice(0, 2)
                            .join('')}
                        </div>
                      )}
                    </IonAvatar>
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-input"
                      className="profile-avatar-input"
                      onChange={handleAvatarChange}
                    />
                    <IonButton
                      size="small"
                      fill="outline"
                      className="profile-avatar-button"
                      onClick={() => document.getElementById('avatar-input')?.click()}
                    >
                      <IonIcon icon={cameraOutline} slot="start" />
                      Cambiar foto
                    </IonButton>
                  </div>

                  <IonList className="profile-info-list">
                    <IonItem lines="none">
                      <IonIcon icon={mailOutline} slot="start" className="profile-info-icon" />
                      <IonLabel>
                        <h2>{profile.nombre}</h2>
                        <p>{profile.email}</p>
                      </IonLabel>
                      <IonBadge color={isAdmin ? 'warning' : 'success'}>
                        {isAdmin ? 'Admin' : 'Cliente'}
                      </IonBadge>
                    </IonItem>
                    <IonItem lines="none">
                      <IonIcon icon={calendarOutline} slot="start" className="profile-info-icon" />
                      <IonLabel>
                        <h3>Miembro desde</h3>
                        <p>
                          {new Date(profile.fechaRegistro).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </IonLabel>
                    </IonItem>
                  </IonList>

                  <IonCard className="profile-preferences-card">
                    <IonCardHeader>
                      <IonCardSubtitle>Preferencias</IonCardSubtitle>
                      <IonCardTitle>Tu experiencia</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonText className="profile-preferences-text">
                        Personalizá tu perfil y mantené tus datos actualizados para recibir novedades del complejo.
                      </IonText>
                      <IonList lines="none" className="profile-preferences-list">
                        <IonItem>
                          <IonLabel>
                            <h3>Notificaciones</h3>
                            <p>Recibí alertas cuando tengas nuevos tickets o beneficios.</p>
                          </IonLabel>
                          <IonBadge color="tertiary">Próximamente</IonBadge>
                        </IonItem>
                        <IonItem>
                          <IonLabel>
                            <h3>Preferencias de contacto</h3>
                            <p>Definí cómo querés que te contactemos.</p>
                          </IonLabel>
                          <IonBadge color="tertiary">Próximamente</IonBadge>
                        </IonItem>
                      </IonList>
                    </IonCardContent>
                  </IonCard>
                </>
              ) : (
                <IonText>No se pudo cargar la información del perfil.</IonText>
              )}
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" color="danger" onClick={logout}>
            <IonIcon icon={logOutOutline} slot="start" />
            Cerrar sesión
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Perfil;












