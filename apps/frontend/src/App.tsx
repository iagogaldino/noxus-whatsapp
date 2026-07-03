import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route, useLocation } from 'react-router-dom';
import AdminLayout from './admin/components/AdminLayout';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import EmptyChat from './components/EmptyChat';
import { ChatProvider } from './context/ChatContext';
import ChatDetail from './pages/ChatDetail';
import ChatList from './pages/ChatList';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { useIsDesktop } from './hooks/useIsDesktop';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';
import './theme/whatsapp.css';
import './theme/login.css';
import './admin/theme/admin.css';

setupIonicReact();

const HomeRoute: React.FC = () => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <EmptyChat /> : <ChatList />;
};

const WhatsAppApp: React.FC = () => (
  <PrivateRoute>
    <ChatProvider>
      <div className="wa-app">
        <IonSplitPane contentId="main" when="md" className="wa-split-pane">
          <ChatList sidebar />
          <IonRouterOutlet id="main">
            <Route exact path="/" component={HomeRoute} />
            <Route exact path="/chat/:id" component={ChatDetail} />
            <Route exact path="/profile" component={Profile} />
            <Route exact path="/home">
              <Redirect to="/" />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>
      </div>
    </ChatProvider>
  </PrivateRoute>
);

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();

  if (pathname === '/login') {
    return <Login />;
  }

  if (pathname === '/admin/login') {
    return <Redirect to="/login" />;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminLayout />;
  }

  return <WhatsAppApp />;
};

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
