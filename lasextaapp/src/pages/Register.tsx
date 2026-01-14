import React, { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonText,
  IonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { eye, eyeOff, key, mail, person } from 'ionicons/icons';
import './Register.css';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const { registerUser } = useAuth();
  const history = useHistory();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      await registerUser({ email, password, nombre: name });
      setErrorMessage('');
      history.push('/app/eventos');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message !== ''
          ? error.message
          : 'No se pudo completar el registro. Intentá nuevamente.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 6) return { strength: 'Weak', color: '#ef4444' };
    if (password.length < 10) return { strength: 'Medium', color: '#f59e0b' };
    return { strength: 'Strong', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength();
  const isFormValid = email.trim() !== '' && name.trim() !== '' && password.trim().length >= 6;

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

        {/* Tarjeta principal de registro */}
        <div className="auth-card">
          {/* Título */}
          <div className="auth-header">
            <h1 className="auth-title">Registrate</h1>
            <p className="auth-subtitle">Ingresa tus datos en los siguientes campos</p>
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
                  placeholder="@gmail.com"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value!)}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Campo Name */}
            <div className="input-group">
              <label className="input-label">Tu Nombre</label>
              <div className="input-container">
                <IonIcon icon={person} className="input-icon" />
                <IonInput
                  type="text"
                  placeholder="Nombre"
                  value={name}
                  onIonInput={(e) => setName(e.detail.value!)}
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
              {/* Indicador de fortaleza de contraseña */}
              {password.length > 0 && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{ 
                        width: password.length < 6 ? '33%' : password.length < 10 ? '66%' : '100%',
                        backgroundColor: passwordStrength.color
                      }}
                    ></div>
                  </div>
                  <span className="strength-text" style={{ color: passwordStrength.color }}>
                    {passwordStrength.strength}
                  </span>
                </div>
              )}
            </div>

            {/* Botón Sign Up */}
            <IonButton 
              className="auth-button primary-button"
              expand="block"
              onClick={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? 'Creando cuenta...' : 'Registrarse'}
            </IonButton>

            {/* Enlace a Login */}
            <div className="auth-link">
              <p className="auth-link-text">
                Ya Tenes Una Cuenta? 
                <a href="/login" className="auth-link-button">Iniciar Sesión</a>
              </p>
            </div>

            {!isFormValid && (
              <IonText className="register-helper-text">
                La contraseña debe tener al menos 6 caracteres y los campos no pueden estar vacíos.
              </IonText>
            )}
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

export default Register;
