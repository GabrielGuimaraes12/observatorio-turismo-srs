
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HRDashboard } from './HRDashboard';

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
const mockedRevokeInvitation = vi.mocked(revokeInvitation);
const mockedGetUsers = vi.mocked(getUsers);
const mockedDeactivateUser = vi.mocked(deactivateUser);
const mockedActivateUser = vi.mocked(activateUser);

const invitation = {
  id: 'invite-1',
  email: 'convidado@example.com',
  role: 'ADMIN' as const,
  expiresAt: '2026-11-10T12:00:00.000Z',
  createdAt: '2026-11-03T12:00:00.000Z',
};

const user = {
  id: 'user-2',
  name: 'Maria Teste',
  email: 'maria@example.com',
  role: 'ADMIN' as const,
  isActive: true,
  createdAt: '2026-10-20T12:00:00.000Z',
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/rh']}>
      <Routes>
        <Route path="/rh" element={<HRDashboard />} />
        <Route path="/login" element={<h1>Tela de login</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HRDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();

    sessionStorage.setItem(
      'authUser',
      JSON.stringify({
        id: 'hr-1',
        name: 'Responsável RH',
        role: 'HR',
      }),
    );

    sessionStorage.setItem('authToken', 'jwt-teste');

    mockedGetInvitations.mockResolvedValue([]);
    mockedGetUsers.mockResolvedValue([]);
    mockedRevokeInvitation.mockResolvedValue({
      success: true,
      id: 'invite-1',
    });
    mockedDeactivateUser.mockResolvedValue({
      success: true,
      id: 'user-2',
    });
    mockedActivateUser.mockResolvedValue({
      success: true,
      id: 'user-2',
    });
  });

  it('renderiza o dashboard e as três abas', async () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: 'Dashboard RH' }),
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

  it('permite criar convites somente para HR e ADMIN', async () => {
    mockedCreateInvitation.mockResolvedValue({
      ...invitation,
      token: 'token-secreto-123',
    });

    renderDashboard();

    expect(
      screen.getByRole('option', { name: 'HR' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('option', { name: 'ADMIN' }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('option', { name: 'BUSINESS' }),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText('E-mail do convidado'),
      { target: { value: 'convidado@example.com' } },
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar convite' }),
    );

    await waitFor(() => {
      expect(mockedCreateInvitation).toHaveBeenCalledWith(
        'convidado@example.com',
        'ADMIN',
      );
    });

    expect(
      await screen.findByRole('dialog'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('token-secreto-123'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Copiei, fechar' }),
    );

    expect(
      screen.queryByText('token-secreto-123'),
    ).not.toBeInTheDocument();
  });

  it('lista os convites pendentes', async () => {
    mockedGetInvitations.mockResolvedValue([invitation]);

    renderDashboard();

    expect(
      await screen.findByText('convidado@example.com'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Revogar' }),
    ).toBeInTheDocument();
  });

  it('permite revogar um convite', async () => {
    mockedGetInvitations.mockResolvedValue([invitation]);

    renderDashboard();

    await screen.findByText('convidado@example.com');

    fireEvent.click(
      screen.getByRole('button', { name: 'Revogar' }),
    );

    await waitFor(() => {
      expect(mockedRevokeInvitation).toHaveBeenCalledWith(
        'invite-1',
      );
    });

    expect(
      await screen.findByText('Convite revogado com sucesso.'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('convidado@example.com'),
    ).not.toBeInTheDocument();
  });

  it('consulta os usuários do perfil selecionado', async () => {
    mockedGetUsers.mockImplementation(async (role) =>
      role === 'ADMIN' ? [user] : [],
    );

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'ADMIN' }),
    );

    expect(
      await screen.findByText('Maria Teste'),
    ).toBeInTheDocument();

    expect(
      mockedGetUsers,
    ).toHaveBeenCalledWith('ADMIN');

    expect(
      screen.getByText('maria@example.com'),
    ).toBeInTheDocument();
  });

  it('permite desativar usuários', async () => {
    mockedGetUsers.mockResolvedValue([user]);

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    await screen.findByText('Maria Teste');

    fireEvent.click(
      screen.getByRole('button', { name: 'Desativar' }),
    );

    await waitFor(() => {
      expect(mockedDeactivateUser).toHaveBeenCalledWith(
        'user-2',
      );
    });

    expect(
      await screen.findByText('Usuário desativado com sucesso.'),
    ).toBeInTheDocument();
  });

  it('impede que o RH desative a própria conta', async () => {
    mockedGetUsers.mockResolvedValue([
      {
        ...user,
        id: 'hr-1',
        name: 'Responsável RH',
        role: 'HR',
      },
    ]);

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    await screen.findByText('Responsável RH');

    expect(
      screen.getByRole('button', { name: 'Desativar' }),
    ).toBeDisabled();

    expect(
      screen.getByText('Sua conta'),
    ).toBeInTheDocument();

    expect(
      mockedDeactivateUser,
    ).not.toHaveBeenCalled();
  });

  it('permite reativar contas inativas', async () => {
    mockedGetUsers.mockResolvedValue([
      { ...user, isActive: false },
    ]);

    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Usuários' }),
    );

    await screen.findByText('Maria Teste');

    fireEvent.click(
      screen.getByRole('button', { name: 'Reativar' }),
    );

    await waitFor(() => {
      expect(mockedActivateUser).toHaveBeenCalledWith(
        'user-2',
      );
    });

    expect(
      await screen.findByText('Usuário reativado com sucesso.'),
    ).toBeInTheDocument();
  });

  it('exibe o placeholder de logs', async () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Logs' }),
    );

    expect(
      screen.getByText('Logs ainda não disponíveis.'),
    ).toBeInTheDocument();
  });

  it('redireciona para login ao receber erro 401', async () => {
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
