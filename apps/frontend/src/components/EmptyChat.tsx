import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { chatbubblesOutline } from 'ionicons/icons';

interface EmptyChatProps {
  desktopOnly?: boolean;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ desktopOnly = false }) => (
  <IonPage className={desktopOnly ? 'ion-hide-md-down' : ''}>
    <IonContent>
      <div className="wa-empty-state">
        <IonIcon icon={chatbubblesOutline} />
        <h2>Noxustalk</h2>
        <p>
          Envie e receba mensagens sem manter seu celular conectado.
          Use o Noxustalk em até 4 dispositivos vinculados e 1 celular.
        </p>
      </div>
    </IonContent>
  </IonPage>
);

export default EmptyChat;
