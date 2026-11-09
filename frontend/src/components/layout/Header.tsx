import { NavLink } from 'react-router-dom';
import logoObservatorio from '../../assets/logo-observatorio.png';
import { getDashboardPath, getSessionUser } from '../../services/authService';
import './Header.css';

export function Header() {
  const user = getSessionUser();
  const dashboard = user && sessionStorage.getItem('authToken')
    ? getDashboardPath(user.role)
    : undefined;
  return (
    <header className="site-header">
      <div className="header-container">

        <NavLink to="/" className="header-logo">
          <img
            src={logoObservatorio}
            alt="Observatório do Turismo de Santa Rita do Sapucaí"
          />
        </NavLink>

        <nav className="header-navigation">

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon"></span>
            Início
          </NavLink>

          <NavLink
            to="/indicadores"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon"></span>
            Indicadores
          </NavLink>

          <NavLink
            to="/relatorios"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon"></span>
            Relatórios
          </NavLink>

          <NavLink to={dashboard ?? '/login'} className="nav-link">
            <span className="nav-icon"></span>
            {dashboard ? 'Minha área' : 'Entrar'}
          </NavLink>

        </nav>

      </div>
    </header>
  );
}
