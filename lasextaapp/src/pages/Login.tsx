import React, { useState } from 'react';
import { IonButton, IonContent, IonIcon, IonInput, IonPage, IonText, IonToast, IonModal } from '@ionic/react';
import { eye, eyeOff, key, mail, arrowBack, checkmarkCircle, closeOutline } from 'ionicons/icons';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset, verifyResetCode, resetPassword } from '../api/auth';

type ResetStep = 'email' | 'code' | 'newPassword' | 'success';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estados para recuperación de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await login({ email, password });
      setErrorMessage('');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'No se pudo iniciar sesión. Verificá las credenciales.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email.trim() !== '' && password.trim().length >= 6;

  const handleForgotPassword = () => {
    setShowResetModal(true);
    setResetStep('email');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setResetErrorMessage('');
    setSuccessMessage('');
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetStep('email');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setResetErrorMessage('');
    setSuccessMessage('');
  };

  const handleRequestResetCode = async () => {
    if (resetEmail.trim() === '') {
      setResetErrorMessage('Por favor, ingresá tu email.');
      return;
    }

    try {
      setIsResetLoading(true);
      setResetErrorMessage('');
      await requestPasswordReset(resetEmail);
      setSuccessMessage('Si el email existe, se envió un código de recuperación.');
      setResetStep('code');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'No se pudo enviar el código. Intentá nuevamente.';
      setResetErrorMessage(message);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (resetCode.trim() === '' || resetCode.length !== 6) {
      setResetErrorMessage('Por favor, ingresá el código de 6 dígitos.');
      return;
    }

    try {
      setIsResetLoading(true);
      setResetErrorMessage('');
      await verifyResetCode(resetEmail, resetCode);
      setResetStep('newPassword');
      setSuccessMessage('Código verificado correctamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'Código inválido o expirado.';
      setResetErrorMessage(message);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.trim().length < 6) {
      setResetErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsResetLoading(true);
      setResetErrorMessage('');
      await resetPassword(resetEmail, resetCode, newPassword);
      setResetStep('success');
      setSuccessMessage('Contraseña restablecida exitosamente.');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'No se pudo restablecer la contraseña. Intentá nuevamente.';
      setResetErrorMessage(message);
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <IonPage className="auth-page">
      <IonContent fullscreen className="auth-content">
        {/* Espacio superior para isla flotante / barra de estado */}
        <div className="status-spacer" />

        {/* Partículas de fondo */}
        <div className="background-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
        </div>

        {/* Tarjeta principal de login */}
        <div className="auth-card">
          {/* Logo centrado */}
          <div className="logo-section">
            <div className="logo-container logo-glow">
              <img src="/LogoHome.PNG" alt="La Sexta Logo" className="main-logo" />
            </div>
          </div>

          {/* Formulario */}
          <div className="auth-form">
            {/* Campo Email */}
            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-container">
                <IonIcon icon={mail} className="input-icon" />
                <IonInput
                  type="email"
                  placeholder="Email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value!)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div className="input-container">
                <IonIcon icon={key} className="input-icon" />
                <IonInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value!)}
                  className="auth-input"
                />
                <IonIcon 
                  icon={showPassword ? eyeOff : eye} 
                  className="input-icon password-toggle"
                  onClick={togglePasswordVisibility}
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="forgot-password">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="forgot-link-button"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Sign In */}
            <IonButton 
              className="auth-button primary-button"
              expand="block"
              onClick={handleLogin}
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </IonButton>

            <IonButton 
              className="auth-button secondary-button"
              expand="block"
              routerLink="/register"
              disabled={isLoading}
            >
              ¿No tenés cuenta? Registrate
            </IonButton>
          </div>
        </div>
        <IonToast
          isOpen={errorMessage !== ''}
          message={errorMessage}
          duration={2500}
          color="danger"
          onDidDismiss={() => setErrorMessage('')}
        />

        {/* Modal de recuperación de contraseña */}
        <IonModal isOpen={showResetModal} onDidDismiss={handleCloseResetModal}>
          <IonContent className="reset-modal-content">
            <div className="reset-modal-container">
              <div className="reset-modal-header">
                <IonText className="reset-modal-title">
                  {resetStep === 'email' && 'Recuperar Contraseña'}
                  {resetStep === 'code' && 'Verificar Código'}
                  {resetStep === 'newPassword' && 'Nueva Contraseña'}
                  {resetStep === 'success' && '¡Éxito!'}
                </IonText>
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="reset-modal-close"
                  aria-label="Cerrar"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </div>

              <div className="reset-modal-body">
                {/* Paso 1: Ingresar email */}
                {resetStep === 'email' && (
                  <div className="reset-step">
                    <IonText className="reset-step-description">
                      Ingresá tu email y te enviaremos un código de recuperación.
                    </IonText>
                    <div className="input-group">
                      <label className="input-label">Email</label>
                      <div className="input-container">
                        <IonIcon icon={mail} className="input-icon" />
                        <IonInput
                          type="email"
                          placeholder="Email"
                          value={resetEmail}
                          onIonInput={(e) => setResetEmail(e.detail.value!)}
                          className="auth-input"
                          disabled={isResetLoading}
                        />
                      </div>
                    </div>
                    {resetErrorMessage && (
                      <IonText color="danger" className="reset-error-message">
                        {resetErrorMessage}
                      </IonText>
                    )}
                    {successMessage && (
                      <IonText color="success" className="reset-success-message">
                        {successMessage}
                      </IonText>
                    )}
                    <IonButton
                      className="auth-button primary-button"
                      expand="block"
                      onClick={handleRequestResetCode}
                      disabled={isResetLoading || resetEmail.trim() === ''}
                    >
                      {isResetLoading ? 'Enviando...' : 'Enviar Código'}
                    </IonButton>
                  </div>
                )}

                {/* Paso 2: Verificar código */}
                {resetStep === 'code' && (
                  <div className="reset-step">
                    <IonText className="reset-step-description">
                      Ingresá el código de 6 dígitos que recibiste por email.
                    </IonText>
                    <div className="input-group">
                      <label className="input-label">Código</label>
                      <div className="input-container">
                        <IonIcon icon={key} className="input-icon" />
                        <IonInput
                          type="text"
                          placeholder="000000"
                          value={resetCode}
                          onIonInput={(e) => setResetCode(e.detail.value!.replace(/\D/g, '').slice(0, 6))}
                          className="auth-input"
                          disabled={isResetLoading}
                          maxlength={6}
                        />
                      </div>
                    </div>
                    {resetErrorMessage && (
                      <IonText color="danger" className="reset-error-message">
                        {resetErrorMessage}
                      </IonText>
                    )}
                    {successMessage && (
                      <IonText color="success" className="reset-success-message">
                        {successMessage}
                      </IonText>
                    )}
                    <div className="reset-modal-actions">
                      <IonButton
                        className="auth-button secondary-button"
                        expand="block"
                        onClick={() => setResetStep('email')}
                        disabled={isResetLoading}
                      >
                        Volver
                      </IonButton>
                      <IonButton
                        className="auth-button primary-button"
                        expand="block"
                        onClick={handleVerifyCode}
                        disabled={isResetLoading || resetCode.length !== 6}
                      >
                        {isResetLoading ? 'Verificando...' : 'Verificar Código'}
                      </IonButton>
                    </div>
                  </div>
                )}

                {/* Paso 3: Nueva contraseña */}
                {resetStep === 'newPassword' && (
                  <div className="reset-step">
                    <IonText className="reset-step-description">
                      Ingresá tu nueva contraseña.
                    </IonText>
                    <div className="input-group">
                      <label className="input-label">Nueva Contraseña</label>
                      <div className="input-container">
                        <IonIcon icon={key} className="input-icon" />
                        <IonInput
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="••••••••••"
                          value={newPassword}
                          onIonInput={(e) => setNewPassword(e.detail.value!)}
                          className="auth-input"
                          disabled={isResetLoading}
                        />
                        <IonIcon
                          icon={showNewPassword ? eyeOff : eye}
                          className="input-icon password-toggle"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        />
                      </div>
                    </div>
                    {resetErrorMessage && (
                      <IonText color="danger" className="reset-error-message">
                        {resetErrorMessage}
                      </IonText>
                    )}
                    {successMessage && (
                      <IonText color="success" className="reset-success-message">
                        {successMessage}
                      </IonText>
                    )}
                    <div className="reset-modal-actions">
                      <IonButton
                        className="auth-button secondary-button"
                        expand="block"
                        onClick={() => setResetStep('code')}
                        disabled={isResetLoading}
                      >
                        Volver
                      </IonButton>
                      <IonButton
                        className="auth-button primary-button"
                        expand="block"
                        onClick={handleResetPassword}
                        disabled={isResetLoading || newPassword.trim().length < 6}
                      >
                        {isResetLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                      </IonButton>
                    </div>
                  </div>
                )}

                {/* Paso 4: Éxito */}
                {resetStep === 'success' && (
                  <div className="reset-step">
                    <div className="reset-success-icon">
                      <IonIcon icon={checkmarkCircle} className="success-icon" />
                    </div>
                    <IonText className="reset-step-description">
                      {successMessage || 'Contraseña restablecida exitosamente.'}
                    </IonText>
                    <IonButton
                      className="auth-button primary-button"
                      expand="block"
                      onClick={handleCloseResetModal}
                    >
                      Cerrar
                    </IonButton>
                  </div>
                )}
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Login;
