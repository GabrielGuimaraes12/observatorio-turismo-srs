import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Dashboard } from './Dashboard';

vi.mock('../../components/dashboard/IndicatorsChart', () => ({
  IndicatorsChart: () => (
    <div data-testid="indicators-chart">
      Gráfico de indicadores
    </div>
  ),
}));

describe('Dashboard', () => {
  it('mantém os dados atuais até clicar em Aplicar filtros', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Dashboard começa mostrando 2026
    expect(screen.getByText('120')).toBeInTheDocument();

    // Usuário seleciona 2025
    await user.selectOptions(
      screen.getByLabelText('Período'),
      '2025'
    );

    // Ainda deve mostrar 2026 porque o botão não foi clicado
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByText('105')).not.toBeInTheDocument();

    // Aplica o filtro
    await user.click(
      screen.getByRole('button', {
        name: 'Aplicar filtros',
      })
    );

    // Agora deve mostrar os dados de 2025
    expect(screen.getByText('105')).toBeInTheDocument();
    expect(screen.queryByText('120')).not.toBeInTheDocument();
  });

  it('filtra os indicadores pelo setor', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await user.selectOptions(
      screen.getByLabelText('Setor'),
      'Hospedagem'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Aplicar filtros',
      })
    );

    expect(
      screen.getByText('Leitos disponíveis')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Empregos no setor')
    ).not.toBeInTheDocument();
  });
});