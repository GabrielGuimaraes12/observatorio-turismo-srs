
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Home } from './pages/Home/Home';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Reports } from './pages/Reports/Reports';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';

import { AdminIndicators } from './pages/AdminIndicators/AdminIndicators';
import { AdminReports } from './pages/AdminReports/AdminReports';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard';
import { HRDashboard } from './pages/HRDashboard/HRDashboard';

import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/indicadores" element={<Dashboard />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />

        {/* Rotas exclusivas de ADMIN */}
        <Route
          element={<ProtectedRoute allowedRoles={['ADMIN']} />}
        >
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/relatorios"
            element={<AdminReports />}
          />
          <Route path="/admin/indicadores" element={<AdminIndicators />} />
        </Route>

        {/* Rota exclusiva de RH */}
        <Route
          element={<ProtectedRoute allowedRoles={['HR']} />}
        >
          <Route
            path="/rh"
            element={<HRDashboard />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
