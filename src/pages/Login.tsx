import React, { useState } from 'react';
import { IonButton, IonContent, IonIcon, IonInput, IonPage, IonText, IonToast } from '@ionic/react';
import { eye, eyeOff, key, mail } from 'ionicons/icons';
import './Login.css';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  return (
    <IonPage className="auth-page">
      <IonContent fullscreen className="auth-content">
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
            <div className="logo-container">
              <img src="./logosexta.png" alt="La Sexta Logo" className="main-logo" />
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
              <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
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
      </IonContent>
    </IonPage>
  );
};

export default Login;
