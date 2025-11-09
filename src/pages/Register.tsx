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
              <label className="input-label">Your Name</label>
              <div className="input-container">
                <IonIcon icon={person} className="input-icon" />
                <IonInput
                  type="text"
                  placeholder="@TuNombre"
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

            {/* Separador */}
            <div className="auth-separator">
              <div className="separator-line"></div>
              <span className="separator-text">Registrate con tus Redes Sociales</span>
              <div className="separator-line"></div>
            </div>

            {/* Botones sociales */}
            <div className="social-buttons">
              <button className="social-button instagram-button">
                <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
                  <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f09433"/>
                      <stop offset="25%" stopColor="#e6683c"/>
                      <stop offset="50%" stopColor="#dc2743"/>
                      <stop offset="75%" stopColor="#cc2366"/>
                      <stop offset="100%" stopColor="#bc1888"/>
                    </linearGradient>
                  </defs>
                  <path fill="url(#instagram-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </button>
              <button className="social-button facebook-button">
                <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
            </div>

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
