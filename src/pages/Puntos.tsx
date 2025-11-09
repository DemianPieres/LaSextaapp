import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Puntos.css';

const Puntos: React.FC = () => {
  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Puntos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="content-container">
          <h2>Puntos</h2>
          <p>Gestiona tus puntos y recompensas</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Puntos;





