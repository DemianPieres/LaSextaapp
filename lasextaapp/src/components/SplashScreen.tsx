import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Simular tiempo de carga (como en la versión nativa)
    const timer = setTimeout(() => {
      onFinish();
    }, 2000); // 2 segundos como en Android

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <IonPage className="splash-page">
      <IonContent className="splash-content">
        <div className="splash-container">
          <div className="splash-logo-container">
            <img 
              src="/logosexta.png" 
              alt="La Sexta Logo" 
              className="splash-logo"
            />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SplashScreen;


