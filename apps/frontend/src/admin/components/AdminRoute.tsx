import { Redirect } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
};

export default AdminRoute;
