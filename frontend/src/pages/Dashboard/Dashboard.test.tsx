
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Dashboard } from './Dashboard';
import { getIndicators } from '../../services/indicatorService';

vi.mock('../../services/indicatorService', () => ({
  getIndicators: vi.fn(),
}));

vi.mock('../../components/dashboard/IndicatorsChart', () => ({
  IndicatorsChart: () => (
    <div data-testid="indicators-chart">
      Gráfico de indicadores
    </div>
  ),
}));

const mockedGetIndicators = vi.mocked(getIndicators);

const indicators = [
  {
    id: '1',
    name: 'Leitos disponíveis',
    description: null,
    value: 120,
    unit: '',
    published: true,
    sectorId: 'sector-1',
    periodId: 'period-2026',
    sector: { id: 'sector-1', name: 'Hospedagem' },
    period: { id: 'period-2026', name: '2026' },
  },
  {
    id: '2',
    name: 'Leitos disponíveis',
    description: null,
    value: 105,
    unit: '',
    published: true,
    sectorId: 'sector-1',
    periodId: 'period-2025',
    sector: { id: 'sector-1', name: 'Hospedagem' },
    period: { id: 'period-2025', name: '2025' },
  },
  {
    id: '3',
    name: 'Empregos no setor',
    description: null,
    value: 300,
    unit: '',
    published: true,
    sectorId: 'sector-2',
    periodId: 'period-2026',
    sector: { id: 'sector-2', name: 'Comércio' },
    period: { id: 'period-2026', name: '2026' },
  },
  {
    id: '4',
    name: 'Indicador não publicado',
    description: null,
    value: 999,
    unit: '',
    published: false,
    sectorId: 'sector-2',
    periodId: 'period-2026',
    sector: { id: 'sector-2', name: 'Comércio' },
    period: { id: 'period-2026', name: '2026' },
  },
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedGetIndicators.mockResolvedValue(indicators);
  });

  it('carrega indicadores publicados da API', async () => {
    renderDashboard();

    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('105')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();

    expect(
      screen.queryByText('Indicador não publicado')
    ).not.toBeInTheDocument();

    expect(mockedGetIndicators).toHaveBeenCalledOnce();
    expect(screen.getByTestId('indicators-chart')).toBeInTheDocument();
  });

  it('mantém os dados atuais até clicar em Aplicar filtros', async () => {
    const user = userEvent.setup();

    renderDashboard();

    await screen.findByText('120');

    await user.selectOptions(
      screen.getByLabelText('Período'),
      '2025'
    );

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('105')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Aplicar filtros' })
    );

    expect(screen.getByText('105')).toBeInTheDocument();
    expect(screen.queryByText('120')).not.toBeInTheDocument();
    expect(screen.queryByText('300')).not.toBeInTheDocument();
  });

  it('filtra os indicadores pelo setor', async () => {
    const user = userEvent.setup();

    renderDashboard();

    await screen.findByText('120');

    await user.selectOptions(
      screen.getByLabelText('Setor'),
      'Hospedagem'
    );

    await user.click(
      screen.getByRole('button', { name: 'Aplicar filtros' })
    );

    expect(screen.getAllByText('Leitos disponíveis')).toHaveLength(2);

    expect(
      screen.queryByText('Empregos no setor')
    ).not.toBeInTheDocument();
  });

  it('mostra uma mensagem quando não existem indicadores', async () => {
    mockedGetIndicators.mockResolvedValue([]);

    renderDashboard();

    expect(
      await screen.findByText('Nenhum indicador encontrado')
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId('indicators-chart')
    ).not.toBeInTheDocument();
  });

  it('mostra uma mensagem quando a API falha', async () => {
    mockedGetIndicators.mockRejectedValue(
      new Error('Falha de conexão')
    );

    renderDashboard();

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent(
      'Não foi possível carregar os indicadores.'
    );
  });

  it('mostra o estado de carregamento', () => {
    mockedGetIndicators.mockImplementation(
      () => new Promise(() => {})
    );

    renderDashboard();

    expect(
      screen.getByRole('status')
    ).toHaveTextContent('Carregando indicadores...');
  });
});
