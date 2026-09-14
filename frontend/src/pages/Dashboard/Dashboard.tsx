import { useState } from 'react';
import { mockIndicators } from '../../services/mockIndicators';
import { IndicatorCard } from '../../components/dashboard/IndicatorCard';
import './Dashboard.css';

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('Todos');
  const [selectedSector, setSelectedSector] = useState('Todos');

  const periods = [
    'Todos',
    ...new Set(mockIndicators.map((indicator) => indicator.period)),
  ];

  const sectors = [
    'Todos',
    ...new Set(mockIndicators.map((indicator) => indicator.sector)),
  ];

  const filteredIndicators = mockIndicators.filter((indicator) => {
    const matchesPeriod =
      selectedPeriod === 'Todos' || indicator.period === selectedPeriod;

    const matchesSector =
      selectedSector === 'Todos' || indicator.sector === selectedSector;

    return matchesPeriod && matchesSector;
  });

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <p className="dashboard-subtitle">
            Santa Rita do Sapucaí
          </p>

          <h1>Observatório do Turismo</h1>

          <p className="dashboard-description">
            Indicadores turísticos e econômicos do município.
          </p>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="section-title">
          <h2>Indicadores turísticos</h2>
          <p>Visão geral dos principais dados do setor.</p>
        </div>

        <div className="dashboard-filters">
          <div className="filter-group">
            <label htmlFor="period-filter">Período</label>

            <select
              id="period-filter"
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sector-filter">Setor</label>

            <select
              id="sector-filter"
              value={selectedSector}
              onChange={(event) => setSelectedSector(event.target.value)}
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </div>

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

        {filteredIndicators.length === 0 && (
          <p className="no-results">
            Nenhum indicador encontrado para os filtros selecionados.
          </p>
        )}
      </section>
    </main>
  );
}