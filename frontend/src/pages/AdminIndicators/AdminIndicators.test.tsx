import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';

describe('Gerenciamento de indicadores', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const sector = { id: 's1', name: 'Hospedagem' };
  const period = { id: 'p1', name: '2026' };
  const indicator = {
    id: 'i1', name: 'Ocupação', value: 48, sector, period,
    sectorId: sector.id, periodId: period.id, published: false,
  };

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/indicadores');
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    sessionStorage.setItem('authToken', `header.${payload}.signature`);
    sessionStorage.setItem('authUser', JSON.stringify({ id: 'admin-1', role: 'ADMIN' }));
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('cria, publica e exclui um indicador', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([sector]))
      .mockResolvedValueOnce(Response.json([period]))
      .mockResolvedValueOnce(Response.json(indicator))
      .mockResolvedValueOnce(Response.json({ ...indicator, published: true }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Novo indicador' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ocupação' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '48' } });
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar indicador' }));

    expect(await screen.findByText('Rascunho')).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({
      name: 'Ocupação', value: 48, sectorId: 's1', periodId: 'p1', published: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText('Publicado')).toBeInTheDocument();
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(/\/indicators\/i1$/);
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe('PATCH');
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toEqual({ published: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Nenhum indicador cadastrado.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[5]?.[1]?.method).toBe('DELETE');
  });
});
