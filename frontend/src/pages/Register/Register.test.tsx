
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Register } from './Register';
import { register } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  register: vi.fn(),
}));

const mockedRegister = vi.mocked(register);

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/cadastro']}>
      <Routes>
        <Route path="/cadastro" element={<Register />} />
        <Route
          path="/login"
          element={<div>Página de login</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function fillForm(invitationToken = '') {
  fireEvent.change(
    screen.getByLabelText('Nome completo'),
    { target: { value: 'Usuário Teste' } },
  );

  fireEvent.change(
    screen.getByLabelText('E-mail'),
    { target: { value: 'teste@example.com' } },
  );

  fireEvent.change(
    screen.getByLabelText('Senha'),
    { target: { value: 'Senha123!' } },
  );

  if (invitationToken) {
    fireEvent.change(
      screen.getByLabelText('Token de convite (opcional)'),
      { target: { value: invitationToken } },
    );
  }
}

describe('Register - Cadastro com convite', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedRegister.mockResolvedValue({
      token: 'jwt-teste',
      user: {
        id: 'user-1',
        name: 'Usuário Teste',
        email: 'teste@example.com',
        role: 'USER',
        createdAt: '2026-11-03T12:00:00.000Z',
      },
    });
  });

  it('renderiza todos os campos necessários', () => {
    renderRegister();

    expect(
      screen.getByRole('heading', { name: 'Criar conta' }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Nome completo'),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('E-mail'),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Senha'),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Token de convite (opcional)'),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText('Perfil'),
    ).not.toBeInTheDocument();
  });

  it('permite cadastro sem convite', async () => {
    renderRegister();

    fillForm();

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar conta' }),
    );

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith({
        name: 'Usuário Teste',
        email: 'teste@example.com',
        password: 'Senha123!',
        invitationToken: '',
      });
    });

    expect(
      await screen.findByText('Página de login'),
    ).toBeInTheDocument();
  });

  it('envia o token quando informado', async () => {
    renderRegister();

    fillForm('convite-valido-123');

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar conta' }),
    );

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith({
        name: 'Usuário Teste',
        email: 'teste@example.com',
        password: 'Senha123!',
        invitationToken: 'convite-valido-123',
      });
    });
  });

  it('exibe erro quando o convite é inválido', async () => {
    mockedRegister.mockRejectedValue(
      new Error('Convite inválido ou expirado.'),
    );

    renderRegister();

    fillForm('convite-invalido');

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar conta' }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Convite inválido ou expirado.');

    expect(
      screen.queryByText('Página de login'),
    ).not.toBeInTheDocument();
  });

  it('exibe erro quando o e-mail já está cadastrado', async () => {
    mockedRegister.mockRejectedValue(
      new Error('E-mail já cadastrado.'),
    );

    renderRegister();

    fillForm();

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar conta' }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('E-mail já cadastrado.');
  });

  it('desabilita o botão durante o cadastro', async () => {
    mockedRegister.mockImplementation(
      () => new Promise(() => {}),
    );

    renderRegister();

    fillForm();

    fireEvent.click(
      screen.getByRole('button', { name: 'Criar conta' }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Cadastrando...',
      }),
    ).toBeDisabled();
  });
});
