const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface ApiIndicator {
  id: string;
  name: string;
  description: string | null;
  value: number;
  unit: string | null;
  published: boolean;
  sectorId: string;
  periodId: string;
  sector: {
    id: string;
    name: string;
  };
  period: {
    id: string;
    name: string;
  };
}

export async function getIndicators(): Promise<ApiIndicator[]> {
  const response = await fetch(`${API_URL}/indicators/public`);

  if (!response.ok) {
    throw new Error('Não foi possível carregar os indicadores.');
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Formato inválido dos indicadores.');
  }

  return data as ApiIndicator[];
}