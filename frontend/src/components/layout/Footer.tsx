import logoObservatorio from '../../assets/logo-observatorio.png';
import logoPrefeitura from '../../assets/logo-prefeitura.png';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">

        <div className="footer-logo">
          <img
            src={logoObservatorio}
            alt="Observatório do Turismo de Santa Rita do Sapucaí"
          />
        </div>

        <nav className="footer-navigation">
          <a href="/">Início</a>
          <a href="/indicadores">Indicadores</a>
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