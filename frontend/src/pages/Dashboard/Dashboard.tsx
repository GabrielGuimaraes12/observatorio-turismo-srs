import { useState } from 'react';

import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';

import { IndicatorCard } from '../../components/dashboard/IndicatorCard';
import { IndicatorsChart } from '../../components/dashboard/IndicatorsChart';

import { mockIndicators } from '../../services/mockIndicators';

import './Dashboard.css';

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [selectedType, setSelectedType] = useState('Todos');

  const periods = [
    'Todos',
    ...new Set(
      mockIndicators.map((indicator) => indicator.period)
    ),
  ];

  const sectors = [
    'Todos',
    ...new Set(
      mockIndicators.map((indicator) => indicator.sector)
    ),
  ];

  const filteredIndicators = mockIndicators.filter((indicator) => {
    const matchesPeriod =
      selectedPeriod === 'Todos' ||
      indicator.period === selectedPeriod;

    const matchesSector =
      selectedSector === 'Todos' ||
      indicator.sector === selectedSector;

    return matchesPeriod && matchesSector;
  });

  const chartData = filteredIndicators.map((indicator) => ({
    name:
      selectedPeriod === 'Todos'
        ? `${indicator.name} - ${indicator.period}`
        : indicator.name,

    value: indicator.value,
  }));

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

              <h1>
                Indicadores do Turismo
              </h1>

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


        {/* FILTROS E CARDS */}

        <section className="indicators-container">

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
                  <option
                    key={period}
                    value={period}
                  >
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
                  <option
                    key={sector}
                    value={sector}
                  >
                    {sector}
                  </option>
                ))}

              </select>

            </div>


            {/* TIPO DE INDICADOR */}

            <div className="filter-field">

              <label htmlFor="type-filter">
                Tipo de indicador
              </label>

              <select
                id="type-filter"
                value={selectedType}
                onChange={(event) =>
                  setSelectedType(event.target.value)
                }
              >

                <option value="Todos">
                  Todos
                </option>

              </select>

            </div>


            {/* BOTÃO */}

            <button
              type="button"
              className="filter-button"
            >
              Aplicar filtros
            </button>

          </div>


          {/* CARDS DOS INDICADORES */}

          <div className="indicator-grid">

            {filteredIndicators.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                name={indicator.name}
                value={indicator.value}
                unit={indicator.unit}
              />
            ))}

          </div>


          {/* SEM RESULTADOS */}

          {filteredIndicators.length === 0 && (

            <div className="no-results">

              <h3>
                Nenhum indicador encontrado
              </h3>

              <p>
                Não existem dados disponíveis para os filtros
                selecionados.
              </p>

            </div>

          )}

        </section>


        {/* GRÁFICO */}

        {filteredIndicators.length > 0 && (

          <section className="charts-section">

            <IndicatorsChart
              data={chartData}
            />

          </section>

        )}


        {/* FONTE DOS DADOS */}

        <section className="data-source">

          <span className="data-source-icon">
            ⓘ
          </span>

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