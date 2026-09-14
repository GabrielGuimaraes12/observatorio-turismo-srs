interface IndicatorCardProps {
  name: string;
  value: number;
  unit?: string;
}

export function IndicatorCard({
  name,
  value,
  unit,
}: IndicatorCardProps) {
  return (
    <article className="indicator-card">
      <span className="indicator-label">{name}</span>

      <strong className="indicator-value">
        {value}
        {unit && <span className="indicator-unit"> {unit}</span>}
      </strong>
    </article>
  );
}