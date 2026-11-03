
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminDashboard } from './AdminDashboard';
import {
  activateUser,
  createInvitation,
  deactivateUser,
  getInvitations,
  getUsers,
  ManagementApiError,
  revokeInvitation,
} from '../../services/managementService';

vi.mock('../../services/managementService', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../services/managementService')>();

  return {
    ...original,
    activateUser: vi.fn(),
    createInvitation: vi.fn(),
    deactivateUser: vi.fn(),
    getInvitations: vi.fn(),
    getUsers: vi.fn(),
    revokeInvitation: vi.fn(),
  };
});

const mockedGetInvitations = vi.mocked(getInvitations);
const mockedCreateInvitation = vi.mocked(createInvitation);
const mockedGetUsers = vi.mocked(getUsers);
const mockedDeactivateUser = vi.mocked(deactivateUser);
const mockedActivateUser = vi.mocked(activateUser);
const mockedRevokeInvitation = vi.mocked(revokeInvitation);

const businessUser = {
  id: 'business-1',
  name: 'Empresa Teste',
  email: 'empresa@example.com',
  role: 'BUSINESS' as const,
  isActive: true,
  createdAt: '2026-11-01T12:00:00.000Z',
};

const invitation = {
  id: 'invite-business-1',
  email: 'empresa@example.com',
  role: 'BUSINESS' as const,
  createdAt: '2026-11-03T12:00:00.000Z',
  expiresAt: '2026-11-06T12:00:00.000Z',
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<h1>Tela de login</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();

    sessionStorage.setItem('authToken', 'jwt-teste');
    sessionStorage.setItem(
      'authUser',
      JSON.stringify({
        id: 'admin-1',
        name: 'Administrador Teste',
        role: 'ADMIN',
      }),
    );

    mockedGetInvitations.mockResolvedValue([]);
    mockedGetUsers.mockResolvedValue([]);
    mockedCreateInvitation.mockResolvedValue({
      ...invitation,
      token: 'token-business-teste',
    });
    mockedRevokeInvitation.mockResolvedValue({
      success: true,
      id: invitation.id,
    });
    mockedDeactivateUser.mockResolvedValue({
      success: true,
      id: businessUser.id,
    });
    mockedActivateUser.mockResolvedValue({
      success: true,
      id: businessUser.id,
    });
  });

  it('renderiza o Dashboard ADMIN', async () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: 'Dashboard ADMIN' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Convites' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Usuários' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Logs' }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText('Nenhum convite pendente.'),
    ).toBeInTheDocument();
  });

  it('permite criar convite somente para BUSINESS', async () => {
    renderDashboard();

    expect(
      screen.getByText('O ADMIN pode convidar somente usuários BUSINESS.', {
        exact: false,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('combobox', { name: 'Perfil do convite' }),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText('E-mail do convidado'),
      { target: { value: 'empresa@example.com' } },
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar convite' }),
    );

    await waitFor(() => {
      expect(mockedCreateInvitation).toHaveBeenCalledWith(
        'empresa@example.com',
        'BUSINESS',
      );
    });

    expect(
      await screen.findByRole('dialog'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('token-business-teste'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Copiei, fechar' }),
    );

    expect(
      screen.queryByText('token-business-teste'),
    ).not.toBeInTheDocument();
  });

  it('consulta apenas os perfis BUSINESS e USER', async () => {
    mockedGetUsers.mockImplementation(async (role) =>
      role === 'BUSINESS' ? [businessUser] : [],
    );

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    expect(
      screen.getByRole('button', { name: 'BUSINESS' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'USER' }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'HR' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'ADMIN' }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByText('Empresa Teste'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'USER' }),
    );

    await waitFor(() => {
      expect(mockedGetUsers).toHaveBeenCalledWith('USER');
    });

    const requestedRoles = mockedGetUsers.mock.calls.map(
      ([role]) => role,
    );

    expect(requestedRoles).not.toContain('HR');
    expect(requestedRoles).not.toContain('ADMIN');

    expect(
      requestedRoles.every(
        (role) => role === 'BUSINESS' || role === 'USER',
      ),
    ).toBe(true);
  });

  it('lista e revoga convites próprios', async () => {
    mockedGetInvitations.mockResolvedValue([invitation]);

    renderDashboard();

    expect(
      await screen.findByText('empresa@example.com'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Revogar' }),
    );

    await waitFor(() => {
      expect(mockedRevokeInvitation).toHaveBeenCalledWith(
        invitation.id,
      );
    });

    expect(
      await screen.findByText('Convite revogado com sucesso.'),
    ).toBeInTheDocument();
  });

  it('permite desativar contas BUSINESS', async () => {
    mockedGetUsers.mockResolvedValue([businessUser]);

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    await screen.findByText('Empresa Teste');

    fireEvent.click(
      screen.getByRole('button', { name: 'Desativar' }),
    );

    await waitFor(() => {
      expect(mockedDeactivateUser).toHaveBeenCalledWith(
        businessUser.id,
      );
    });

    expect(
      await screen.findByText('Usuário desativado com sucesso.'),
    ).toBeInTheDocument();
  });

  it('permite reativar contas BUSINESS', async () => {
    mockedGetUsers.mockResolvedValue([
      { ...businessUser, isActive: false },
    ]);

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    await screen.findByText('Empresa Teste');

    fireEvent.click(
      screen.getByRole('button', { name: 'Reativar' }),
    );

    await waitFor(() => {
      expect(mockedActivateUser).toHaveBeenCalledWith(
        businessUser.id,
      );
    });

    expect(
      await screen.findByText('Usuário reativado com sucesso.'),
    ).toBeInTheDocument();
  });

  it('redireciona para login quando recebe 401', async () => {
    mockedGetInvitations.mockRejectedValue(
      new ManagementApiError('Sessão inválida', 401),
    );

    renderDashboard();

    expect(
      await screen.findByText('Tela de login'),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(sessionStorage.getItem('authUser')).toBeNull();
  });
});
