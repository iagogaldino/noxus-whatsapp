import {
  IonAlert,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonSearchbar,
  IonSpinner,
} from '@ionic/react';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AdminHeader } from '../components/AdminHeader';
import { useSectors } from '../context/SectorContext';
import { Sector } from '../types/sector';

const SectorList: React.FC = () => {
  const history = useHistory();
  const { searchSectors, deleteSector, isLoading, error } = useSectors();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Sector | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = searchSectors(query);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const result = await deleteSector(deleteTarget.id);
    if (result.success) {
      setDeleteTarget(null);
      setDeleteError('');
    } else {
      setDeleteError(result.error ?? 'Falha ao excluir setor.');
    }
  };

  return (
    <IonPage className="admin-app">
      <AdminHeader title="Setores" />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-page__header">
            <div>
              <h2 className="admin-page__title">Departamentos</h2>
              <p className="admin-page__subtitle">{filtered.length} setor(es)</p>
            </div>
            <IonButton
              className="admin-btn-primary ion-hide-sm-down"
              onClick={() => history.push('/admin/sectors/new')}
            >
              <IonIcon icon={addOutline} slot="start" />
              Novo
            </IonButton>
          </div>

          <IonSearchbar
            className="admin-searchbar"
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
            placeholder="Buscar por nome ou descrição"
            debounce={200}
          />

          {isLoading ? (
            <div className="admin-empty">
              <IonSpinner name="crescent" />
              <p>Carregando setores…</p>
            </div>
          ) : error ? (
            <div className="admin-empty">
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="admin-mobile-list">
                <IonList className="admin-list">
                  {filtered.map((sector) => (
                    <IonItem key={sector.id} className="admin-employee-item" lines="full">
                      <div className="admin-employee-item__main">
                        <div className="admin-employee-item__name">{sector.name}</div>
                        <div className="admin-employee-item__email">
                          {sector.description || 'Sem descrição'}
                        </div>
                        <div className="admin-employee-item__meta">
                          <span className={`admin-badge admin-badge--${sector.status}`}>
                            {sector.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="admin-employee-actions" slot="end">
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => history.push(`/admin/sectors/${sector.id}/edit`)}
                        >
                          <IonIcon icon={createOutline} slot="icon-only" />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => setDeleteTarget(sector)}
                        >
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              </div>

              <div className="admin-desktop-table">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Descrição</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((sector) => (
                      <tr key={sector.id}>
                        <td className="admin-table__name">{sector.name}</td>
                        <td>{sector.description || '—'}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${sector.status}`}>
                            {sector.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-employee-actions">
                            <IonButton
                              fill="clear"
                              size="small"
                              className="admin-btn-icon"
                              onClick={() => history.push(`/admin/sectors/${sector.id}/edit`)}
                            >
                              <IonIcon icon={createOutline} slot="icon-only" />
                            </IonButton>
                            <IonButton
                              fill="clear"
                              size="small"
                              color="danger"
                              onClick={() => setDeleteTarget(sector)}
                            >
                              <IonIcon icon={trashOutline} slot="icon-only" />
                            </IonButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div className="admin-empty">
                  <p>Nenhum setor encontrado.</p>
                </div>
              )}
            </>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="ion-hide-md-up">
          <IonFabButton className="admin-fab" onClick={() => history.push('/admin/sectors/new')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={!!deleteTarget}
          onDidDismiss={() => {
            setDeleteTarget(null);
            setDeleteError('');
          }}
          header="Remover setor"
          message={
            deleteError ||
            `Deseja remover ${deleteTarget?.name}? Esta ação não pode ser desfeita.`
          }
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Remover', role: 'destructive', handler: handleDelete },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SectorList;
