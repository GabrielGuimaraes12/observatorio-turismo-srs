import { Link } from 'react-router-dom';
import logoObservatorio from '../../assets/logo-observatorio.png';
import logoPrefeitura from '../../assets/logo-prefeitura.png';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">

        <Link to="/" className="footer-logo">
          <img
            src={logoObservatorio}
            alt="Observatório do Turismo de Santa Rita do Sapucaí"
          />
        </Link>

        <nav className="footer-navigation">
          <Link to="/">Início</Link>
          <Link to="/indicadores">Indicadores</Link>
          <a href="/relatorios">Relatórios</a>
          <a href="/sobre">Sobre</a>
        </nav>

        <div className="footer-prefeitura">
          <img
            src={logoPrefeitura}
            alt="Prefeitura de Santa Rita do Sapucaí"
          />
        </div>

      </div>
    </footer>
  );
}