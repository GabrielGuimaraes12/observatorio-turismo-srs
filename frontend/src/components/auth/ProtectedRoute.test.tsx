
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

function createToken(expiresInSeconds: number) {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

function renderProtectedRoute() {
  render(
    <MemoryRouter initialEntries={['/admin/relatorios']}>
      <Routes>
        <Route path="/login" element={<h1>Tela de login</h1>} />
        <Route path="/" element={<h1>Página inicial</h1>} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/admin/relatorios"
            element={<h1>Área administrativa</h1>}
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('redireciona para login quando não existe token', () => {
    renderProtectedRoute();

    expect(
      screen.getByText('Tela de login')
    ).toBeInTheDocument();
  });

  it('bloqueia usuário sem permissão ADMIN', () => {
    sessionStorage.setItem('authToken', createToken(3600));
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({ role: 'USER' })
    );

    renderProtectedRoute();

    expect(
      screen.getByText('Página inicial')
    ).toBeInTheDocument();
  });

  it('bloqueia token expirado', () => {
    sessionStorage.setItem('authToken', createToken(-3600));
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({ role: 'ADMIN' })
    );

    renderProtectedRoute();

    expect(
      screen.getByText('Tela de login')
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('authToken')).toBeNull();
  });

  it('permite acesso para administrador com token não expirado', () => {
    sessionStorage.setItem('authToken', createToken(3600));
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({ role: 'ADMIN' })
    );

    renderProtectedRoute();

    expect(
      screen.getByText('Área administrativa')
    ).toBeInTheDocument();
  });
});
