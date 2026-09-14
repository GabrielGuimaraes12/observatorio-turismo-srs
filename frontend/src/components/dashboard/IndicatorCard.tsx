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
    <div className="indicator-card">
      <h3>{name}</h3>

      <p>
        {value} {unit}
      </p>
    </div>
  );
}