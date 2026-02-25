import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { starOutline } from 'ionicons/icons';
import './Puntos.css';

const Puntos: React.FC = () => {
  return (
    <IonPage className="page-with-shared-background">
      <IonContent fullscreen className="page-content">
        <div className="puntos-coming-soon-container">
          <div className="puntos-coming-soon-content">
            <div className="puntos-coming-soon-icon">
              <IonIcon icon={starOutline} />
            </div>
            <h1 className="puntos-coming-soon-title">PROXIMAMENTE!</h1>
            <p className="puntos-coming-soon-text">
              Estamos trabajando en algo increíble para vos.
            </p>
            <p className="puntos-coming-soon-subtext">
              Muy pronto podrás acumular puntos y canjearlos por premios exclusivos.
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Puntos;





