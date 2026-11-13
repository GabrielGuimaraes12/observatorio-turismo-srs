import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminLayout } from './AdminLayout';

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminLayout>
              <h1>Área administrativa</h1>
            </AdminLayout>
          }
        />
        <Route path="/" element={<h1>Site público</h1>} />
        <Route path="/login" element={<h1>Tela de login</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    sessionStorage.clear();
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
  });

  it('renderiza o conteúdo administrativo', () => {
    renderAdminLayout();

    expect(
      screen.getByRole('heading', { name: 'Área administrativa' }),
    ).toBeInTheDocument();
  });

  it('volta ao site público sem encerrar a sessão', async () => {
    renderAdminLayout();

    fireEvent.click(screen.getByRole('link', { name: 'Voltar ao site' }));

    expect(
      await screen.findByRole('heading', { name: 'Site público' }),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('authToken')).toBe('jwt-teste');
    expect(sessionStorage.getItem('authUser')).not.toBeNull();
  });

  it('encerra a sessão e redireciona para o login', async () => {
    renderAdminLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByRole('heading', { name: 'Tela de login' }),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(sessionStorage.getItem('authUser')).toBeNull();
  });
});
