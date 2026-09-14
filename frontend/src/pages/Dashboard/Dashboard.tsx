import { mockIndicators } from '../../services/mockIndicators';
import { IndicatorCard } from '../../components/dashboard/IndicatorCard';

export function Dashboard() {
  return (
    <main>
      <h1>Observatório do Turismo</h1>

      <section>
        {mockIndicators.map((indicator) => (
          <IndicatorCard
            key={indicator.id}
            name={indicator.name}
            value={indicator.value}
            unit={indicator.unit}
          />
        ))}
      </section>
    </main>
  );
}