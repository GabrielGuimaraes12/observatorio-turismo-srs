import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AdminIndicators } from './AdminIndicators';
import {
    getIndicatorManagementData,
    saveIndicator,
    deleteIndicator,
} from '../../services/indicatorService';
import type {
    ApiIndicator,
    IndicatorReference,
} from '../../services/indicatorService';

vi.mock('../../services/indicatorService', () => ({
    getIndicatorManagementData: vi.fn(),
    saveIndicator: vi.fn(),
    deleteIndicator: vi.fn(),
}));

const sector: IndicatorReference = {
    id: 's1',
    name: 'Hospedagem',
};

const indicator: ApiIndicator = {
    id: 'i1',
    name: 'Ocupação',
    description: 'Taxa de ocupação hoteleira',
    value: 48,
    unit: '%',
    sectorId: sector.id,
    periodId: 'p1',
    sector,
    period: {
        id: 'p1',
        name: 'janeiro de 2026 a dezembro de 2026',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
    },
    published: false,
};

function renderAdminIndicators() {
    return render(
        <MemoryRouter>
            <AdminIndicators />
        </MemoryRouter>,
    );
}

describe('Gerenciamento de indicadores', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(getIndicatorManagementData).mockResolvedValue([
            [],
            [sector],
        ]);

        vi.mocked(saveIndicator).mockResolvedValue(indicator);

        vi.mocked(deleteIndicator).mockResolvedValue({
            success: true,
        });
    });

    it('cria um indicador utilizando datas inicial e final', async () => {
        const user = userEvent.setup();

        renderAdminIndicators();

        await user.click(
            await screen.findByRole('button', {
                name: '+ Novo indicador',
            }),
        );

        await user.type(screen.getByLabelText('Nome'), 'Ocupação');

        await user.type(
            screen.getByLabelText('Valor'),
            '48',
        );

        await user.type(
            screen.getByLabelText('Descrição'),
            'Taxa de ocupação hoteleira',
        );

        await user.type(
            screen.getByLabelText('Unidade'),
            '%',
        );

        await user.selectOptions(
            screen.getByLabelText('Setor'),
            's1',
        );

        await user.type(
            screen.getByLabelText('Data inicial'),
            '2026-01-01',
        );

        await user.type(
            screen.getByLabelText('Data final'),
            '2026-12-31',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Salvar indicador',
            }),
        );

        await waitFor(() => {
            expect(saveIndicator).toHaveBeenCalledWith(
                {
                    name: 'Ocupação',
                    description: 'Taxa de ocupação hoteleira',
                    value: 48,
                    unit: '%',
                    sectorId: 's1',
                    period: {
                        startDate: '2026-01-01',
                        endDate: '2026-12-31',
                    },
                    published: false,
                },
                undefined,
            );
        });

        expect(
            await screen.findByText('Indicador salvo.'),
        ).toBeInTheDocument();
    });

    it('publica um indicador', async () => {
        const user = userEvent.setup();

        vi.mocked(getIndicatorManagementData).mockResolvedValue([
            [{ ...indicator }],
            [sector],
        ]);

        vi.mocked(saveIndicator).mockResolvedValue({
            ...indicator,
            published: true,
        });

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdminIndicators();

        await screen.findByText('Ocupação');

        await user.click(
            screen.getByRole('button', {
                name: 'Publicar',
            }),
        );

        await waitFor(() => {
            expect(saveIndicator).toHaveBeenCalledWith(
                { published: true },
                'i1',
            );
        });

        expect(
            await screen.findByText('Publicado'),
        ).toBeInTheDocument();
    });

    it('exclui um indicador após confirmação', async () => {
        const user = userEvent.setup();

        vi.mocked(getIndicatorManagementData).mockResolvedValue([
            [{ ...indicator }],
            [sector],
        ]);

        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderAdminIndicators();

        await screen.findByText('Ocupação');

        await user.click(
            screen.getByRole('button', {
                name: 'Excluir',
            }),
        );

        await waitFor(() => {
            expect(deleteIndicator).toHaveBeenCalledWith('i1');
        });

        expect(
            await screen.findByText('Nenhum indicador cadastrado.'),
        ).toBeInTheDocument();
    });

    it('não exclui um indicador quando a confirmação é cancelada', async () => {
        const user = userEvent.setup();

        vi.mocked(getIndicatorManagementData).mockResolvedValue([
            [{ ...indicator }],
            [sector],
        ]);

        vi.spyOn(window, 'confirm').mockReturnValue(false);

        renderAdminIndicators();

        await screen.findByText('Ocupação');

        await user.click(
            screen.getByRole('button', {
                name: 'Excluir',
            }),
        );

        expect(deleteIndicator).not.toHaveBeenCalled();
        expect(screen.getByText('Ocupação')).toBeInTheDocument();
    });
});
