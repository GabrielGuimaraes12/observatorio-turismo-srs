import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Login } from './Login';

describe('Login', () => {
  it('renderiza a tela de login corretamente', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', {
        name: /acesso à área administrativa/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('E-mail')
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Senha')
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Esqueci minha senha')
    ).toBeInTheDocument();
  });

  it('mostra erros quando o formulário é enviado vazio', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    );

    expect(
      screen.getByText('Informe seu e-mail.')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Informe sua senha.')
    ).toBeInTheDocument();
  });

  it('mostra erro quando o e-mail é inválido', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText('E-mail');
    const passwordInput = screen.getByLabelText('Senha');

    fireEvent.change(emailInput, {
      target: { value: 'email-invalido' },
    });

    fireEvent.change(passwordInput, {
      target: { value: '123456' },
    });

    fireEvent.submit(
      screen.getByRole('button', {
        name: 'Entrar',
      }).closest('form')!
    );

    expect(
      screen.getByText('Informe um e-mail válido!')
    ).toBeInTheDocument();
  });

  it('remove o erro do campo quando o usuário começa a digitar novamente', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    );

    expect(
      screen.getByText('Informe seu e-mail.')
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('E-mail'),
      'gabriel@teste.com'
    );

    expect(
      screen.queryByText('Informe seu e-mail.')
    ).not.toBeInTheDocument();
  });
    it('mantém a senha oculta por padrão e permite mostrá-la', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Senha');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: 'Mostrar senha' })
    );

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Ocultar senha' })
    ).toBeInTheDocument();
  });

  it('permite ocultar novamente a senha sem apagar o conteúdo digitado', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Senha');

    await user.type(passwordInput, 'minhaSenha123');

    await user.click(
      screen.getByRole('button', { name: 'Mostrar senha' })
    );

    expect(passwordInput).toHaveValue('minhaSenha123');
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', { name: 'Ocultar senha' })
    );

    expect(passwordInput).toHaveValue('minhaSenha123');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});