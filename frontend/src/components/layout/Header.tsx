import logoObservatorio from '../../assets/logo-observatorio.png';
import './Header.css';

export function Header() {
  return (
    <header className="site-header">
      <div className="header-container">

        <a href="/" className="header-logo">
          <img
            src={logoObservatorio}
            alt="Observatório do Turismo de Santa Rita do Sapucaí"
          />
        </a>

        <nav className="header-navigation">

          <a href="/" className="nav-link active">
            <span className="nav-icon"></span>
            Início
          </a>

          <a href="/indicadores" className="nav-link">
            <span className="nav-icon"></span>
            Indicadores
          </a>

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