import { AdminLayout } from '../../components/admin/AdminLayout';
import { HRDashboard } from '../HRDashboard/HRDashboard';

export function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="admin-dashboard-page">
        <header className="admin-dashboard-header">
          <h1>Dashboard Administrativo</h1>
          <p>Gerencie os usuários, convites e informações do Observatório do Turismo.</p>
        </header>

        <HRDashboard mode="ADMIN" />
      </div>
    </AdminLayout>
  );
}
