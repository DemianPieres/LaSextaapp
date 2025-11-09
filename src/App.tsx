import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { cart, gift, ticket, star, person } from 'ionicons/icons';
import Home from './pages/Home';
import MisTickets from './pages/MisTickets';
import Beneficios from './pages/Beneficios';
import Puntos from './pages/Puntos';
import Perfil from './pages/Perfil';
import Login from './pages/Login';
import Register from './pages/Register';
import SharedBackground from './components/SharedBackground';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/admin/AdminDashboard';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const { session, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <IonApp>
        <IonPage>
          <IonContent className="ion-text-center ion-padding">
            <div style={{ marginTop: '40vh' }}>
              <IonSpinner name="crescent" />
              <p>Cargando sesión...</p>
            </div>
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  const isAuthenticated = session !== null;
  const isAdminSession = session?.type === 'admin';

  return (
    <IonApp>
      <IonReactRouter>
        <SharedBackground>
          <IonRouterOutlet>
            <Route
              exact
              path="/"
              render={() => {
                if (!isAuthenticated) {
                  return <Redirect to="/login" />;
                }
                return isAdminSession ? <Redirect to="/admin" /> : <Redirect to="/app/eventos" />;
              }}
            />

            <Route
              exact
              path="/login"
              render={() =>
                isAuthenticated ? <Redirect to={isAdminSession ? '/admin' : '/app/eventos'} /> : <Login />
              }
            />

            <Route
              exact
              path="/register"
              render={() => (isAuthenticated ? <Redirect to="/app/eventos" /> : <Register />)}
            />

            <Route
              path="/admin"
              render={() => (isAdminSession ? <AdminDashboard /> : <Redirect to="/login" />)}
            />

            <Route
              path="/app"
              render={() => {
                if (!isAuthenticated || isAdminSession) {
                  return <Redirect to={isAdminSession ? '/admin' : '/login'} />;
                }

                return (
                  <IonTabs>
                    <IonRouterOutlet>
                      <Route exact path="/app/eventos" component={Home} />
                      <Route exact path="/app/mis-tickets" component={MisTickets} />
                      <Route exact path="/app/beneficios" component={Beneficios} />
                      <Route exact path="/app/puntos" component={Puntos} />
                      <Route exact path="/app/perfil" component={Perfil} />
                      <Route exact path="/app" render={() => <Redirect to="/app/eventos" />} />
                    </IonRouterOutlet>
                    <IonTabBar slot="bottom" className="custom-tab-bar">
                      <IonTabButton tab="mis-tickets" href="/app/mis-tickets">
                        <IonIcon icon={cart} />
                        <IonLabel>Mis Tickets</IonLabel>
                      </IonTabButton>
                      <IonTabButton tab="beneficios" href="/app/beneficios">
                        <IonIcon icon={gift} />
                        <IonLabel>Beneficios</IonLabel>
                      </IonTabButton>
                      <IonTabButton tab="eventos" href="/app/eventos">
                        <IonIcon icon={ticket} />
                        <IonLabel>Eventos</IonLabel>
                      </IonTabButton>
                      <IonTabButton tab="puntos" href="/app/puntos">
                        <IonIcon icon={star} />
                        <IonLabel>Puntos</IonLabel>
                      </IonTabButton>
                      <IonTabButton tab="perfil" href="/app/perfil">
                        <IonIcon icon={person} />
                        <IonLabel>Perfil</IonLabel>
                      </IonTabButton>
                    </IonTabBar>
                  </IonTabs>
                );
              }}
            />

            <Route render={() => <Redirect to="/" />} />
          </IonRouterOutlet>
        </SharedBackground>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;