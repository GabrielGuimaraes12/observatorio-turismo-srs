import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { Header } from './Header';

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
      <Routes>
        <Route path="/" element={<h1>Página inicial</h1>} />
        <Route path="/login" element={<h1>Tela de login</h1>} />
        <Route path="/admin" element={<h1>Dashboard administrativo</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('exibe Entrar para visitantes não autenticados', () => {
    renderHeader();

    expect(
      screen.getByRole('link', { name: 'Entrar' }),
    ).toHaveAttribute('href', '/login');
  });

  it('exibe Área Administrativa para ADMIN autenticado', () => {
    sessionStorage.setItem('authToken', 'jwt-teste');
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({
        id: 'admin-1',
        name: 'Administrador',
        email: 'admin@example.com',
        role: 'ADMIN',
      }),
    );

    renderHeader();

    expect(
      screen.getByRole('link', { name: 'Área Administrativa' }),
    ).toHaveAttribute('href', '/admin');
  });

  it('permite acessar o dashboard administrativo sem remover a sessão', async () => {
    sessionStorage.setItem('authToken', 'jwt-teste');
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({
        id: 'admin-1',
        name: 'Administrador',
        email: 'admin@example.com',
        role: 'ADMIN',
      }),
    );

    renderHeader();

    screen.getByRole('link', { name: 'Área Administrativa' }).click();

    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard administrativo',
      }),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('authToken')).toBe('jwt-teste');
    expect(sessionStorage.getItem('authUser')).not.toBeNull();
  });
});
