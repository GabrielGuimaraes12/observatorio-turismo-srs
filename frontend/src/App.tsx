import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home/Home';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Reports } from './pages/Reports/Reports';
import { Login } from './pages/Login/Login';
import { AdminReports } from './pages/AdminReports/AdminReports';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Register } from './pages/Register/Register';
import { HRDashboard } from './pages/HRDashboard/HRDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/indicadores" element={<Dashboard />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/relatorios" element={<AdminReports/>} />
        </Route>
        <Route path="/cadastro" element={<Register />} />
        <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
        <Route path="/rh" element={<HRDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;