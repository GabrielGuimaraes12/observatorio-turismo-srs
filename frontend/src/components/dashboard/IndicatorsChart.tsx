import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartItem {
  name: string;
  value: number;
}

interface IndicatorsChartProps {
  data: ChartItem[];
}

export function IndicatorsChart({ data }: IndicatorsChartProps) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Visão geral dos indicadores</h3>
        <p>Comparação dos valores selecionados.</p>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="value"
              fill="#6c5ce0"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}