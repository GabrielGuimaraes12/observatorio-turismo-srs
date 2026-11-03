
import { useEffect, useState } from 'react';

import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { IndicatorCard } from '../../components/dashboard/IndicatorCard';
import { IndicatorsChart } from '../../components/dashboard/IndicatorsChart';

import {
  getIndicators,
  type ApiIndicator,
} from '../../services/indicatorService';

import './Dashboard.css';

export function Dashboard() {
  // Indicadores carregados da API
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Valores selecionados nos filtros
  const [selectedPeriod, setSelectedPeriod] = useState('Todos');
  const [selectedSector, setSelectedSector] = useState('Todos');

  // Valores efetivamente aplicados
  const [appliedPeriod, setAppliedPeriod] = useState('Todos');
  const [appliedSector, setAppliedSector] = useState('Todos');

  // Carregar indicadores do backend
  useEffect(() => {
    let active = true;

    async function loadIndicators() {
      try {
        const data = await getIndicators();

        if (active) {
          // Defesa adicional no frontend.
          // O backend também deve filtrar os dados publicados.
          setIndicators(data.filter((item) => item.published));
          setError('');
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os indicadores.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadIndicators();

    return () => {
      active = false;
    };
  }, []);

  // Opções dos filtros
  const periods = [
    'Todos',
    ...new Set(
      indicators.map((indicator) => indicator.period.name)
    ),
  ];

  const sectors = [
    'Todos',
    ...new Set(
      indicators.map((indicator) => indicator.sector.name)
    ),
  ];

  // Aplicar filtros aos indicadores
  const filteredIndicators = indicators.filter((indicator) => {
    const matchesPeriod =
      appliedPeriod === 'Todos' ||
      indicator.period.name === appliedPeriod;

    const matchesSector =
      appliedSector === 'Todos' ||
      indicator.sector.name === appliedSector;

    return matchesPeriod && matchesSector;
  });

  // Preparar dados dos gráficos
  const chartData = filteredIndicators.map((indicator) => ({
    name:
      appliedPeriod === 'Todos'
        ? `${indicator.name} - ${indicator.period.name}`
        : indicator.name,
    value: indicator.value,
  }));

  // Aplicar filtros selecionados
  function handleApplyFilters() {
    setAppliedPeriod(selectedPeriod);
    setAppliedSector(selectedSector);
  }

  return (
    <div className="indicators-page">
      <Header />

      <main>
        {/* HERO */}
        <section className="indicators-hero">
          <div className="indicators-hero-content">
            <div className="indicators-hero-text">
              <p className="indicators-label">
                DADOS PARA DECISÕES MELHORES
              </p>

              <h1>Indicadores do Turismo</h1>

              <p>
                Explore os dados do turismo em Santa Rita do Sapucaí
                e acompanhe a evolução do setor ao longo do tempo.
              </p>
            </div>

            <div className="indicators-illustration">
              <span>▁▃▅▇ ↗</span>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section className="indicators-container">

          {/* CARREGAMENTO */}
          {loading && (
            <div role="status" className="no-results">
              <h3>Carregando indicadores...</h3>
              <p>Buscando informações no Observatório do Turismo.</p>
            </div>
          )}

          {/* ERRO */}
          {!loading && error && (
            <div role="alert" className="no-results">
              <h3>Erro ao carregar indicadores</h3>
              <p>{error}</p>
            </div>
          )}

          {/* CONTEÚDO */}
          {!loading && !error && (
            <>
              {/* FILTROS */}
              <div className="filters-container">

                {/* PERÍODO */}
                <div className="filter-field">
                  <label htmlFor="period-filter">
                    Período
                  </label>

                  <select
                    id="period-filter"
                    value={selectedPeriod}
                    onChange={(event) =>
                      setSelectedPeriod(event.target.value)
                    }
                  >
                    {periods.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SETOR */}
                <div className="filter-field">
                  <label htmlFor="sector-filter">
                    Setor
                  </label>

                  <select
                    id="sector-filter"
                    value={selectedSector}
                    onChange={(event) =>
                      setSelectedSector(event.target.value)
                    }
                  >
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                {/* APLICAR FILTROS */}
                <button
                  type="button"
                  className="filter-button"
                  onClick={handleApplyFilters}
                >
                  Aplicar filtros
                </button>
              </div>

              {/* CARDS */}
              <div className="indicator-grid">
                {filteredIndicators.map((indicator) => (
                  <IndicatorCard
                    key={indicator.id}
                    name={indicator.name}
                    value={indicator.value}
                    unit={indicator.unit ?? ''}
                  />
                ))}
              </div>

              {/* NENHUM RESULTADO */}
              {filteredIndicators.length === 0 && (
                <div className="no-results">
                  <h3>Nenhum indicador encontrado</h3>
                  <p>
                    Não existem dados disponíveis para os filtros
                    selecionados.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* GRÁFICO */}
        {!loading && !error && filteredIndicators.length > 0 && (
          <section className="charts-section">
            <IndicatorsChart data={chartData} />
          </section>
        )}

        {/* FONTE DOS DADOS */}
        <section className="data-source">
          <span className="data-source-icon">ⓘ</span>

          <p>
            Os dados apresentados são coletados a partir de fontes
            oficiais e pesquisas do Observatório do Turismo de
            Santa Rita do Sapucaí.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
