import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonText,
} from '@ionic/react';
import { chatbubbles, lockClosedOutline, mailOutline } from 'ionicons/icons';
import { useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../utils/navigation';

const Login: React.FC = () => {
  const { replace } = useAppNavigate();
  const { login, isAuthenticated, isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect to={isAdmin ? '/admin' : '/'} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      replace(result.role === 'admin' ? '/admin' : '/');
    } else {
      setError(result.error ?? 'Erro ao entrar.');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-page">
        <div className="login-page__bg" aria-hidden="true" />
        <div className="login-page__wrapper">
          <div className="login-page__card">
            <div className="login-page__brand">
              <div className="login-page__icon">
                <IonIcon icon={chatbubbles} />
              </div>
              <h1 className="login-page__title">Noxus WhatsApp</h1>
              <p className="login-page__subtitle">Entre com sua conta corporativa</p>
            </div>

            <form className="login-page__form" onSubmit={handleSubmit}>
              <label className="login-page__label" htmlFor="login-email">
                E-mail
              </label>
              <div className="login-page__input-wrap">
                <IonIcon icon={mailOutline} className="login-page__input-icon" />
                <IonInput
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  required
                />
              </div>

              <label className="login-page__label" htmlFor="login-password">
                Senha
              </label>
              <div className="login-page__input-wrap">
                <IonIcon icon={lockClosedOutline} className="login-page__input-icon" />
                <IonInput
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                  required
                />
              </div>

              {error && (
                <IonText color="danger">
                  <p className="login-page__error">{error}</p>
                </IonText>
              )}

              <IonButton
                expand="block"
                type="submit"
                disabled={loading}
                className="login-page__submit"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </IonButton>
            </form>

            <div className="login-page__demo">
              <span className="login-page__demo-title">Contas de demonstração</span>
              <div className="login-page__demo-row">
                <span className="login-page__demo-badge">Admin</span>
                <span>admin@noxus.dev / admin123</span>
              </div>
              <div className="login-page__demo-row">
                <span className="login-page__demo-badge login-page__demo-badge--employee">
                  Funcionário
                </span>
                <span>ana.silva@noxus.dev / ana123</span>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
