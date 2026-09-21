import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import './Home.css';

export function Home() {
  return (
    <div className="home-page">

      <Header />

      <main>

        <section className="home-hero">
          <div className="hero-content">

            <div className="hero-text">
              <p className="hero-label">
                OBSERVATÓRIO DO TURISMO
              </p>

              <h1>
                Dados que impulsionam o turismo em Santa Rita do Sapucaí
              </h1>

              <p className="hero-description">
                Informação, análise e transparência para o desenvolvimento
                sustentável do nosso destino.
              </p>

              <a
                href="/indicadores"
                className="hero-button"
              >
                Conheça os indicadores →
              </a>
            </div>

            <div className="hero-illustration">
              <div className="mountain mountain-back"></div>
              <div className="mountain mountain-front"></div>

              <span>
                SANTA RITA
                <br />
                DO SAPUCAÍ
              </span>
            </div>

          </div>
        </section>

        <section className="home-section shortcuts-section">

          <div className="section-heading">
            <div>
              <p className="section-label">EXPLORE</p>
              <h2>Acesse rapidamente</h2>
            </div>
          </div>

          <div className="shortcut-grid">

            <a href="/indicadores" className="shortcut-card">
              <span className="shortcut-icon">↗</span>

              <div>
                <h3>Indicadores</h3>
                <p>
                  Acompanhe os principais dados e números do turismo.
                </p>
              </div>
            </a>

            <a href="/relatorios" className="shortcut-card">
              <span className="shortcut-icon">▤</span>

              <div>
                <h3>Relatórios</h3>
                <p>
                  Consulte estudos e publicações sobre o setor turístico.
                </p>
              </div>
            </a>

            <a href="#atrativos" className="shortcut-card">
              <span className="shortcut-icon">⌖</span>

              <div>
                <h3>Atrativos</h3>
                <p>
                  Conheça os principais pontos turísticos do município.
                </p>
              </div>
            </a>

            <a href="#sobre" className="shortcut-card">
              <span className="shortcut-icon">ⓘ</span>

              <div>
                <h3>Sobre o Observatório</h3>
                <p>
                  Saiba mais sobre o projeto e seus objetivos.
                </p>
              </div>
            </a>

          </div>
        </section>

        <section className="home-section indicators-preview">

          <div className="section-heading">
            <div>
              <p className="section-label">
                TURISMO EM NÚMEROS
              </p>

              <h2>
                Indicadores em destaque
              </h2>
            </div>

            <a href="/indicadores" className="section-link">
              Ver todos →
            </a>
          </div>

          <div className="stats-grid">

            <article className="stat-card">
              <span>Visitantes</span>
              <strong>24,8 mil</strong>
              <small>↑ 12% em relação a 2024</small>
            </article>

            <article className="stat-card">
              <span>Ocupação hoteleira</span>
              <strong>68%</strong>
              <small>↑ 5% em relação a 2024</small>
            </article>

            <article className="stat-card">
              <span>Receita turística</span>
              <strong>R$ 4,2 mi</strong>
              <small>↑ 18% em relação a 2024</small>
            </article>

            <article className="stat-card">
              <span>Atrativos</span>
              <strong>12</strong>
              <small>↑ 2 em relação a 2024</small>
            </article>

          </div>

        </section>

        <section className="home-section reports-preview">

          <div className="section-heading">
            <h2>Publicações recentes</h2>

            <a href="/relatorios" className="section-link">
              Ver todos →
            </a>
          </div>

          <div className="reports-grid">

            <article className="report-card">
              <small>12 ago 2026</small>

              <h3>
                Relatório de Indicadores do Turismo – 2026
              </h3>

              <a href="/relatorios">
                Acessar relatório →
              </a>
            </article>

            <article className="report-card">
              <small>10 fev 2026</small>

              <h3>
                Relatório de Turismo em Santa Rita – 2025
              </h3>

              <a href="/relatorios">
                Acessar relatório →
              </a>
            </article>

            <article className="report-card">
              <small>05 dez 2025</small>

              <h3>
                Inventário da Oferta Turística
              </h3>

              <a href="/relatorios">
                Acessar relatório →
              </a>
            </article>

          </div>

        </section>

        <section
          id="sobre"
          className="home-section sustainability-section"
        >

          <div>
            <h2>
              Turismo sustentável para o futuro
            </h2>

            <p>
              Acreditamos no turismo como ferramenta de desenvolvimento
              econômico, social e cultural, valorizando a identidade de
              Santa Rita do Sapucaí.
            </p>
          </div>

          <a href="#sobre" className="secondary-button">
            Saiba mais
          </a>

        </section>

      </main>

      <Footer />

    </div>
  );
}