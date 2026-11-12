import { NavLink, useNavigate } from 'react-router-dom';
import logoObservatorio from '../../assets/logo-observatorio-branco.png';
import { logout } from '../../services/authService';
import './AdminLayout.css';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
    <div className="admin-layout">
        <aside className="admin-sidebar">
            <NavLink
            to="/admin"
            className="admin-sidebar-brand"
            aria-label="Ir para o Dashboard Administrativo"
            >
                <img
                src={logoObservatorio}
                alt="Observatório do Turismo de Santa Rita do Sapucaí"
                />
            </NavLink>
            
            <nav className="admin-sidebar-navigation" aria-label="Navegação administrativa">
                <NavLink to="/admin" end>
                    Dashboard
                </NavLink>

            <NavLink to="/admin/relatorios">
                Relatórios
            </NavLink>

            <NavLink to="/admin/indicadores">
                Indicadores
            </NavLink>

            <NavLink to="/admin/setores">
                Setores
            </NavLink>
            
            </nav>

            <div className="admin-sidebar-bottom">
                <NavLink to="/" className="admin-sidebar-public-link">
                    Voltar ao site
                </NavLink>
                
                <button
                type="button"
                className="admin-sidebar-logout"
                onClick={handleLogout}
                >
                    Sair
                </button>
            </div>
            </aside>

        <div className="admin-layout-content">
            {children}
        </div>
        </div>
    );
}
