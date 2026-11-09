import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';

function startAdminSession(expiresInSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  sessionStorage.setItem('authToken', `header.${btoa(JSON.stringify({ exp }))}.signature`);
  sessionStorage.setItem('authUser', JSON.stringify({ id: 'admin-1', role: 'ADMIN' }));
}

describe('Navegação da sessão', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('permite voltar ao painel e sair da conta sem novo login', async () => {
    startAdminSession(3600);
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Minha área' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard ADMIN' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Minha área' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard ADMIN' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(sessionStorage.getItem('authUser')).toBeNull();
  });

  it('mostra o link de login no portal quando a sessão expirou', () => {
    startAdminSession(-3600);
    render(<App />);

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Minha área' })).not.toBeInTheDocument();
  });

  it('direciona o link Sobre à seção existente na página inicial', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/#sobre');
    expect(document.getElementById('sobre')).toBeInTheDocument();
  });
});
