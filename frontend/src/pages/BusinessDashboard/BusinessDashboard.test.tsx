import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';

const fetchMock = vi.fn<typeof fetch>();

function report(id: string, authorId: string, title: string, published: boolean) {
  return { id, authorId, title, published, fileUrl: 'https://example.com/report.pdf' };
}

function loginAs(role: string) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  sessionStorage.setItem('authToken', `header.${payload}.signature`);
  sessionStorage.setItem('authUser', JSON.stringify({ id: 'empresa-1', role }));
}

describe('Área da empresa', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/business');
    sessionStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('mostra apenas os próprios envios e envia um relatório para revisão', async () => {
    loginAs('BUSINESS');
    fetchMock
      .mockResolvedValueOnce(Response.json([
        report('1', 'empresa-1', 'Relatório anterior', true),
        report('2', 'empresa-2', 'Relatório de terceiros', true),
      ]))
      .mockResolvedValueOnce(Response.json(report('3', 'empresa-1', 'Novo envio', false)));

    render(<App />);
    expect(await screen.findByText('Relatório anterior')).toBeInTheDocument();
    expect(screen.queryByText('Relatório de terceiros')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
    });

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Novo envio' } });
    fireEvent.change(screen.getByLabelText('Link do relatório'), {
      target: { value: 'https://example.com/report.pdf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar relatório' }));

    expect(await screen.findByText('Aguardando publicação')).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      title: 'Novo envio',
      description: '',
      fileUrl: 'https://example.com/report.pdf',
      published: false,
    });
  });

  it('redireciona visitante para o login', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['USER', 'ADMIN', 'HR'])('redireciona %s para a página pública', async (role) => {
    loginAs(role);
    fetchMock.mockImplementation(() => Promise.resolve(Response.json([])));
    render(<App />);
    await screen.findByRole('heading', { name: /dados que impulsionam/i });
    expect(window.location.pathname).toBe('/');
    expect(fetchMock.mock.calls.every(([, options]) => !options?.headers)).toBe(true);
  });
});
