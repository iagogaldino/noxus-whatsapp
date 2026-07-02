import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonText,
} from '@ionic/react';
import { chatbubbles, keypadOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import PhoneInput, { isPhoneInputValid } from '../components/PhoneInput';
import { useAuth } from '../context/AuthContext';
import { useAppNavigate } from '../utils/navigation';
import { formatPhoneLabel, normalizePhoneInput } from '../utils/phone';

type LoginStep = 'phone' | 'code';

const RESEND_COOLDOWN_SECONDS = 60;

const Login: React.FC = () => {
  const { replace } = useAppNavigate();
  const { requestOtp, verifyOtp, isAuthenticated, isAdmin, isLoading } = useAuth();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = setInterval(() => {
      setResendIn((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendIn]);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect to={isAdmin ? '/admin' : '/'} />;
  }

  const normalizedPhone = normalizePhoneInput(phone);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!isPhoneInputValid(normalizedPhone)) {
      setError('Informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(normalizedPhone);
    setLoading(false);

    if (result.success) {
      setStep('code');
      setCode('');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error ?? 'Erro ao enviar código.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.replace(/\D/g, '').length !== 4) {
      setError('Informe o código de 4 dígitos.');
      return;
    }

    setLoading(true);
    const result = await verifyOtp(normalizedPhone, code.replace(/\D/g, ''));
    setLoading(false);

    if (result.success) {
      replace(result.role === 'admin' ? '/admin' : '/');
    } else {
      setError(result.error ?? 'Erro ao entrar.');
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    await handleRequestOtp();
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
              <h1 className="login-page__title">Noxustalk</h1>
              <p className="login-page__subtitle">
                {step === 'phone'
                  ? 'Entre com seu número de telefone'
                  : 'Digite o código enviado no WhatsApp'}
              </p>
            </div>

            {step === 'phone' ? (
              <form className="login-page__form" onSubmit={(e) => void handleRequestOtp(e)}>
                <label className="login-page__label" htmlFor="login-phone">
                  Telefone
                </label>
                <div className="login-page__phone-input">
                  <PhoneInput id="login-phone" value={phone} onChange={setPhone} />
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
                  {loading ? 'Enviando...' : 'Enviar código'}
                </IonButton>
              </form>
            ) : (
              <form className="login-page__form" onSubmit={(e) => void handleVerifyOtp(e)}>
                <p className="login-page__phone-hint">
                  Código enviado para <strong>{formatPhoneLabel(normalizedPhone)}</strong>
                </p>

                <label className="login-page__label" htmlFor="login-code">
                  Código de 4 dígitos
                </label>
                <div className="login-page__input-wrap">
                  <IonIcon icon={keypadOutline} className="login-page__input-icon" />
                  <IonInput
                    id="login-code"
                    type="tel"
                    inputmode="numeric"
                    maxlength={4}
                    placeholder="0000"
                    value={code}
                    onIonInput={(e) => setCode((e.detail.value ?? '').replace(/\D/g, '').slice(0, 4))}
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

                <div className="login-page__secondary-actions">
                  <IonButton
                    fill="clear"
                    size="small"
                    type="button"
                    disabled={resendIn > 0 || loading}
                    onClick={() => void handleResend()}
                  >
                    {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
                  </IonButton>
                  <IonButton
                    fill="clear"
                    size="small"
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setCode('');
                      setError('');
                    }}
                  >
                    Alterar telefone
                  </IonButton>
                </div>
              </form>
            )}

            <div className="login-page__demo">
              <span className="login-page__demo-title">Contas de demonstração</span>
              <div className="login-page__demo-row">
                <span className="login-page__demo-badge">Admin</span>
                <span>{formatPhoneLabel('5511999990001')}</span>
              </div>
              <div className="login-page__demo-row">
                <span className="login-page__demo-badge login-page__demo-badge--employee">
                  Funcionário
                </span>
                <span>{formatPhoneLabel('5511987654321')}</span>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
