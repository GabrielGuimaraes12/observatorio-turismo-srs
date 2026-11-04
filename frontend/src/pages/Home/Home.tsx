
import { useEffect, useState } from 'react';

import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';

import {
  getIndicators,
  type ApiIndicator,
} from '../../services/indicatorService';

import { getReports } from '../../services/reportService';
import type { Report } from '../../types/report';

import './Home.css';

const MAX_INDICATORS = 4;
const MAX_REPORTS = 3;

function formatIndicatorValue(value: number, unit: string | null) {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);

  if (!unit) {
    return formattedValue;
  }

  if (unit === '%') {
    return `${formattedValue}%`;
  }

  if (unit === 'R$' || unit === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(value);
  }

  return `${formattedValue} ${unit}`;
}

function formatReportDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate);
}

export function Home() {
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [indicatorsError, setIndicatorsError] = useState('');
  const [reportsError, setReportsError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadIndicators() {
      try {
        const data = await getIndicators();

        if (!active) return;

        const published = data
          .filter((indicator) => indicator.published)
          .slice(0, MAX_INDICATORS);

        setIndicators(published);
        setIndicatorsError('');
      } catch {
        if (active) {
          setIndicatorsError('Não foi possível carregar os indicadores.');
        }
      } finally {
        if (active) {
          setIndicatorsLoading(false);
        }
      }
    }

    async function loadReports() {
      try {
        const data = await getReports();

        if (!active) return;

        const recentReports = data
          .filter((report) => report.published)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, MAX_REPORTS);

        setReports(recentReports);
        setReportsError('');
      } catch {
        if (active) {
          setReportsError('Não foi possível carregar os relatórios.');
        }
      } finally {
        if (active) {
          setReportsLoading(false);
        }
      }
    }

    void loadIndicators();
    void loadReports();

    return () => {
      active = false;
    };
  }, []);

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

              <a href="/indicadores" className="hero-button">
                Conheça os indicadores →
              </a>
            </div>

            <div className="hero-illustration">
              <div className="mountain mountain-back" />
              <div className="mountain mountain-front" />

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
              <h2>Indicadores em destaque</h2>
            </div>

            <a href="/indicadores" className="section-link">
              Ver todos →
            </a>
          </div>

          {indicatorsLoading && (
            <p role="status">Carregando indicadores...</p>
          )}

          {!indicatorsLoading && indicatorsError && (
            <p role="alert">{indicatorsError}</p>
          )}

          {!indicatorsLoading &&
            !indicatorsError &&
            indicators.length === 0 && (
              <p>Nenhum indicador publicado disponível no momento.</p>
            )}

          {!indicatorsLoading &&
            !indicatorsError &&
            indicators.length > 0 && (
              <div className="stats-grid">
                {indicators.map((indicator) => (
                  <article className="stat-card" key={indicator.id}>
                    <span>{indicator.name}</span>

                    <strong>
                      {formatIndicatorValue(
                        indicator.value,
                        indicator.unit,
                      )}
                    </strong>

                    <small>
                      {indicator.sector?.name ?? 'Setor não informado'}
                      {' · '}
                      {indicator.period?.name ?? 'Período não informado'}
                    </small>
                  </article>
                ))}
              </div>
            )}
        </section>

        <section className="home-section reports-preview">
          <div className="section-heading">
            <h2>Publicações recentes</h2>

            <a href="/relatorios" className="section-link">
              Ver todos →
            </a>
          </div>

          {reportsLoading && (
            <p role="status">Carregando publicações...</p>
          )}

          {!reportsLoading && reportsError && (
            <p role="alert">{reportsError}</p>
          )}

          {!reportsLoading &&
            !reportsError &&
            reports.length === 0 && (
              <p>Nenhuma publicação disponível no momento.</p>
            )}

          {!reportsLoading &&
            !reportsError &&
            reports.length > 0 && (
              <div className="reports-grid">
                {reports.map((report) => (
                  <article className="report-card" key={report.id}>
                    <small>
                      {formatReportDate(report.createdAt)}
                    </small>

                    <h3>{report.name}</h3>

                    {report.pdfUrl ? (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Acessar relatório →
                      </a>
                    ) : (
                      <a href="/relatorios">
                        Ver relatórios →
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
        </section>

        <section
          id="sobre"
          className="home-section sustainability-section"
        >
          <div>
            <h2>Turismo sustentável para o futuro</h2>

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
