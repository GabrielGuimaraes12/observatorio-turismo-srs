import { mockIndicators } from '../../services/mockIndicators';
import { IndicatorCard } from '../../components/dashboard/IndicatorCard';
import './Dashboard.css';

export function Dashboard() {
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

        <div className="indicator-grid">
          {mockIndicators.map((indicator) => (
            <IndicatorCard
              key={indicator.id}
              name={indicator.name}
              value={indicator.value}
              unit={indicator.unit}
            />
          ))}
        </div>
      </section>
    </main>
  );
}