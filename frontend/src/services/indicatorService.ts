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
export interface IndicatorReference {
  id: string;
  name: string;
}

type IndicatorInput = Pick<
  ApiIndicator,
  'name' | 'description' | 'value' | 'unit' | 'published' | 'sectorId' | 'periodId'
>;

async function indicatorAdminRequest<T>(path: string, method = 'GET', input?: Partial<IndicatorInput>): Promise<T> {
  const token = sessionStorage.getItem('authToken');
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(input ? { 'Content-Type': 'application/json' } : {}),
    },
    body: input ? JSON.stringify(input) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(message || 'Não foi possível concluir a operação de indicadores.');
  }

  return response.json() as Promise<T>;
}

export function getIndicatorManagementData() {
  return Promise.all([
    indicatorAdminRequest<ApiIndicator[]>('/indicators'),
    indicatorAdminRequest<IndicatorReference[]>('/sectors'),
    indicatorAdminRequest<IndicatorReference[]>('/periods'),
  ]);
}

export function saveIndicator(input: Partial<IndicatorInput>, id?: string): Promise<ApiIndicator> {
  return id
    ? indicatorAdminRequest(`/indicators/${encodeURIComponent(id)}`, 'PATCH', input)
    : indicatorAdminRequest('/indicators', 'POST', input);
}

export function deleteIndicator(id: string): Promise<{ success: boolean }> {
  return indicatorAdminRequest(`/indicators/${encodeURIComponent(id)}`, 'DELETE');
}
