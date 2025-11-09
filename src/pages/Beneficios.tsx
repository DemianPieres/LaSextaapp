import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Beneficios.css';

const Beneficios: React.FC = () => {
  return (
    <IonPage className="page-with-shared-background">
      <IonHeader className="custom-header">
        <IonToolbar className="header-toolbar">
          <IonTitle>Beneficios</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <div className="content-container">
          <h2>Beneficios</h2>
          <p>Descubre todos los beneficios disponibles</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Beneficios;