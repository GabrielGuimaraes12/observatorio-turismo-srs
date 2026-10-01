import { NavLink } from 'react-router-dom';
import logoObservatorio from '../../assets/logo-observatorio.png';
import './Header.css';

export function Header() {
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

          <NavLink
            to="/login"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon"></span>
            Login
          </NavLink>

        </nav>

      </div>
    </header>
  );
}