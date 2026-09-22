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

          <a href="/relatorios" className="nav-link">
            <span className="nav-icon"></span>
            Relatórios
          </a>

          <a href="/login" className="nav-link">
            <span className="nav-icon"></span>
            Entrar
          </a>

        </nav>

      </div>
    </header>
  );
}