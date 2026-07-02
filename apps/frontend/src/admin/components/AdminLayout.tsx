import {
  IonContent,
  IonHeader,
  IonMenu,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { Route } from 'react-router-dom';
import { EmployeeProvider } from '../context/EmployeeContext';
import AdminDashboard from '../pages/AdminDashboard';
import EmployeeForm from '../pages/EmployeeForm';
import EmployeeList from '../pages/EmployeeList';
import AdminMenu from './AdminMenu';
import AdminRoute from './AdminRoute';

const AdminRoutes: React.FC = () => (
  <>
    <Route exact path="/admin" component={AdminDashboard} />
    <Route exact path="/admin/employees" component={EmployeeList} />
    <Route exact path="/admin/employees/:id/edit" component={EmployeeForm} />
    <Route exact path="/admin/employees/new" component={EmployeeForm} />
  </>
);

const AdminLayout: React.FC = () => (
  <EmployeeProvider>
    <AdminRoute>
      <IonSplitPane contentId="admin-main" when="md" className="admin-split-pane admin-app">
        <IonMenu contentId="admin-main" menuId="admin-menu" className="admin-menu">
          <IonHeader className="ion-hide-md-up">
            <IonToolbar className="admin-toolbar">
              <IonTitle>Menu</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <AdminMenu />
          </IonContent>
        </IonMenu>

        <IonRouterOutlet id="admin-main">
          <AdminRoutes />
        </IonRouterOutlet>
      </IonSplitPane>
    </AdminRoute>
  </EmployeeProvider>
);

export default AdminLayout;
