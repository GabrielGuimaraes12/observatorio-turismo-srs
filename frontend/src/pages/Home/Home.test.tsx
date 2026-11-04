
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Home } from './Home';
import { getIndicators } from '../../services/indicatorService';
import { getReports } from '../../services/reportService';

vi.mock('../../services/indicatorService', () => ({
  getIndicators: vi.fn(),
}));

vi.mock('../../services/reportService', () => ({
  getReports: vi.fn(),
}));

const mockedGetIndicators = vi.mocked(getIndicators);
const mockedGetReports = vi.mocked(getReports);

const publishedIndicator = {
  id: 'indicator-1',
  name: 'Ocupação hoteleira',
  description: 'Taxa de ocupação',
  value: 75,
  unit: '%',
  published: true,
  sectorId: 'sector-1',
  periodId: 'period-1',
  sector: {
    id: 'sector-1',
    name: 'Hospedagem',
  },
  period: {
    id: 'period-1',
    name: '2026',
  },
};

const unpublishedIndicator = {
  ...publishedIndicator,
  id: 'indicator-2',
  name: 'Indicador privado',
  value: 999,
  published: false,
};

const publishedReport = {
  id: 'report-1',
  name: 'Relatório de Turismo 2026',
  period: '2026',
  sector: 'Turismo',
  description: 'Dados do turismo',
  pdfUrl: 'https://example.com/relatorio-2026.pdf',
  published: true,
  createdAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
};

const unpublishedReport = {
  ...publishedReport,
  id: 'report-2',
  name: 'Relatório privado',
  published: false,
};

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home - Integração com API', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetIndicators.mockResolvedValue([]);
    mockedGetReports.mockResolvedValue([]);
  });

  it('renderiza a estrutura principal da página', () => {
    renderHome();

    expect(
      screen.getByRole('heading', {
        name: /dados que impulsionam o turismo/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /indicadores em destaque/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /publicações recentes/i,
      }),
    ).toBeInTheDocument();
  });

  it('carrega indicadores publicados da API', async () => {
    mockedGetIndicators.mockResolvedValue([
      publishedIndicator,
    ]);

    renderHome();

    expect(
      await screen.findByText('Ocupação hoteleira'),
    ).toBeInTheDocument();

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(
      screen.getByText('Hospedagem · 2026'),
    ).toBeInTheDocument();

    expect(mockedGetIndicators).toHaveBeenCalledOnce();
  });

  it('não exibe indicadores não publicados', async () => {
    mockedGetIndicators.mockResolvedValue([
      publishedIndicator,
      unpublishedIndicator,
    ]);

    renderHome();

    expect(
      await screen.findByText('Ocupação hoteleira'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Indicador privado'),
    ).not.toBeInTheDocument();

    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('exibe relatórios publicados com link para o PDF', async () => {
    mockedGetReports.mockResolvedValue([
      publishedReport,
    ]);

    renderHome();

    expect(
      await screen.findByText('Relatório de Turismo 2026'),
    ).toBeInTheDocument();

    const reportLink = screen.getByRole('link', {
      name: /acessar relatório/i,
    });

    expect(reportLink).toHaveAttribute(
      'href',
      'https://example.com/relatorio-2026.pdf',
    );

    expect(reportLink).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('não exibe relatórios não publicados', async () => {
    mockedGetReports.mockResolvedValue([
      publishedReport,
      unpublishedReport,
    ]);

    renderHome();

    expect(
      await screen.findByText('Relatório de Turismo 2026'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Relatório privado'),
    ).not.toBeInTheDocument();
  });

  it('exibe somente os três relatórios mais recentes', async () => {
    const reports = Array.from({ length: 5 }, (_, index) => ({
      ...publishedReport,
      id: `report-${index}`,
      name: `Relatório ${index}`,
      createdAt: `2026-10-${String(index + 10).padStart(2, '0')}T12:00:00.000Z`,
    }));

    mockedGetReports.mockResolvedValue(reports);

    renderHome();

    expect(
      await screen.findByText('Relatório 4'),
    ).toBeInTheDocument();

    expect(screen.getByText('Relatório 3')).toBeInTheDocument();
    expect(screen.getByText('Relatório 2')).toBeInTheDocument();

    expect(screen.queryByText('Relatório 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Relatório 1')).not.toBeInTheDocument();
  });

  it('exibe mensagens quando não há dados publicados', async () => {
    renderHome();

    expect(
      await screen.findByText(
        'Nenhum indicador publicado disponível no momento.',
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        'Nenhuma publicação disponível no momento.',
      ),
    ).toBeInTheDocument();
  });

  it('exibe erros quando as APIs falham', async () => {
    mockedGetIndicators.mockRejectedValue(
      new Error('API indisponível'),
    );

    mockedGetReports.mockRejectedValue(
      new Error('API indisponível'),
    );

    renderHome();

    expect(
      await screen.findByText(
        'Não foi possível carregar os indicadores.',
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        'Não foi possível carregar os relatórios.',
      ),
    ).toBeInTheDocument();
  });

  it('exibe mensagens enquanto os dados estão carregando', async () => {
    mockedGetIndicators.mockImplementation(
      () => new Promise(() => {}),
    );

    mockedGetReports.mockImplementation(
      () => new Promise(() => {}),
    );

    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText('Carregando indicadores...'),
      ).toBeInTheDocument();

      expect(
        screen.getByText('Carregando publicações...'),
      ).toBeInTheDocument();
    });
  });

  it('limita os indicadores em destaque a quatro', async () => {
    const indicators = Array.from(
      { length: 6 },
      (_, index) => ({
        ...publishedIndicator,
        id: `indicator-${index}`,
        name: `Indicador ${index}`,
      }),
    );

    mockedGetIndicators.mockResolvedValue(indicators);

    renderHome();

    expect(
      await screen.findByText('Indicador 0'),
    ).toBeInTheDocument();

    expect(screen.getByText('Indicador 3')).toBeInTheDocument();

    expect(
      screen.queryByText('Indicador 4'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Indicador 5'),
    ).not.toBeInTheDocument();
  });
});
