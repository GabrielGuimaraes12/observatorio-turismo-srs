import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

const fetchMock = vi.fn<typeof fetch>();

function report(id: string, authorId: string, title: string, published: boolean) {
  return {
    id,
    authorId,
    title,
    description: '',
    fileUrl: 'https://example.com/report.pdf',
    published,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    periodId: null,
    period: null,
    sectorId: null,
    sector: null,
  };
}

function loginAs(role: string) {
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  );

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
    const user = userEvent.setup();

    loginAs('BUSINESS');

    fetchMock
      .mockResolvedValueOnce(
        Response.json([
          report('1', 'empresa-1', 'Relatório anterior', true),
          report('2', 'empresa-2', 'Relatório de terceiros', true),
        ]),
      )
      .mockResolvedValueOnce(
        Response.json(
          report('3', 'empresa-1', 'Novo envio', false),
        ),
      );

    render(<App />);

    // Verifica os relatórios carregados.
    expect(
      await screen.findByText('Relatório anterior'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Relatório de terceiros'),
    ).not.toBeInTheDocument();

    // Verifica a autenticação.
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
    });

    // Preenche o título.
    await user.type(
      screen.getByLabelText('Título'),
      'Novo envio',
    );

    // Seleciona o arquivo PDF.
    const pdfFile = new File(
      ['Conteúdo de exemplo do PDF'],
      'relatorio.pdf',
      { type: 'application/pdf' },
    );

    await user.upload(
      screen.getByLabelText('Arquivo PDF'),
      pdfFile,
    );

    expect(
      screen.getByText('relatorio.pdf'),
    ).toBeInTheDocument();

    const submitButton = screen.getByRole('button', {
      name: 'Enviar relatório',
    });

    expect(submitButton).toBeEnabled();

    // Desabilita a validação HTML nativa no ambiente de testes.
    const form = submitButton.closest('form');

    if (form) {
      form.noValidate = true;
    }

    // Envia o formulário.
    await user.click(submitButton);

    // Aguarda a requisição POST.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // Verifica a requisição POST.
    const [url, options] = fetchMock.mock.calls[1];

    expect(url).toBe('http://localhost:3000/api/reports');
    expect(options?.method).toBe('POST');

    expect(options?.headers).toEqual({
      Authorization: `Bearer ${sessionStorage.getItem('authToken')}`,
    });

    // Verifica os dados enviados.
    const formData = options?.body as FormData;

    expect(formData.get('title')).toBe('Novo envio');
    expect(formData.get('description')).toBe('');
    expect(formData.get('published')).toBe('false');
    expect(formData.get('file')).toBeInstanceOf(File);
    expect((formData.get('file') as File).name).toBe('relatorio.pdf');

    // Verifica a mensagem de sucesso.
    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent('Relatório enviado para revisão');

    expect(
      screen.getByText('Novo envio', { selector: 'summary' }),
    ).toBeInTheDocument();
  });

  it('redireciona visitante para o login', async () => {
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Entrar' }),
    ).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['USER', 'ADMIN', 'HR'])(
    'redireciona %s para a página pública',
    async (role) => {
      loginAs(role);

      fetchMock.mockImplementation(() =>
        Promise.resolve(Response.json([])),
      );

      render(<App />);

      await screen.findByRole('heading', {
        name: /dados que impulsionam/i,
      });

      expect(window.location.pathname).toBe('/');

      expect(
        fetchMock.mock.calls.every(
          ([, options]) => !options?.headers,
        ),
      ).toBe(true);
    },
  );
});
